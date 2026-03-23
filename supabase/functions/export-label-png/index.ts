import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { render } from "https://deno.land/x/resvg_wasm@0.2.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPORT_BUCKET = "exports";
const EXPORT_TYPE = "table_png";
const WIDTH = 1200;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[EXPORT-LABEL-PNG] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { recipeVersionId } = await req.json();
    if (!recipeVersionId || typeof recipeVersionId !== "string") {
      return new Response(JSON.stringify({ error: "recipeVersionId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: version, error: versionError } = await supabaseClient
      .from("recipe_versions")
      .select(`
        id,
        version_number,
        results_snapshot,
        recipe:recipes!inner (
          id,
          name,
          owner_user_id
        )
      `)
      .eq("id", recipeVersionId)
      .single();

    if (versionError || !version) {
      throw new Error(versionError?.message ?? "Versão da receita não encontrada");
    }

    const recipe = Array.isArray(version.recipe) ? version.recipe[0] : version.recipe;
    if (!recipe || recipe.owner_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = version.results_snapshot as Record<string, any> | null;
    if (!result?.per_serving || !result?.per_100) {
      throw new Error("A versão da receita não possui resultados nutricionais válidos");
    }

    const { svg, height } = buildNutritionTableSvg(result);
    logStep("svg-built", { width: WIDTH, height, recipeVersionId });

    const pngBytes = render(svg, {
      width: WIDTH,
      fitTo: { mode: "width", value: WIDTH },
    });

    if (!pngBytes || pngBytes.byteLength === 0) {
      throw new Error("PNG server-side gerado vazio");
    }

    const fileName = `${recipeVersionId}_${Date.now()}_tabela_server.png`;
    const path = `${user.id}/${fileName}`;
    const contentType = "image/png";

    logStep("upload-start", {
      width: WIDTH,
      height,
      bytes: pngBytes.byteLength,
      contentType,
      path,
    });

    const { error: uploadError } = await supabaseClient.storage
      .from(EXPORT_BUCKET)
      .upload(path, pngBytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { error: deleteError } = await supabaseClient
      .from("recipe_exports")
      .delete()
      .eq("recipe_version_id", recipeVersionId)
      .eq("export_type", EXPORT_TYPE);

    if (deleteError) {
      throw new Error(`Cleanup failed: ${deleteError.message}`);
    }

    const { error: recordError } = await supabaseClient.from("recipe_exports").insert({
      recipe_version_id: recipeVersionId,
      owner_user_id: user.id,
      export_type: EXPORT_TYPE,
      storage_path: path,
    });

    if (recordError) {
      throw new Error(`Record insert failed: ${recordError.message}`);
    }

    const downloadName = `${slugify(recipe.name)}-tabela-nutricional.png`;
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(path, 3600, { download: downloadName });

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(signedUrlError?.message ?? "Falha ao criar signed URL");
    }

    logStep("upload-success", {
      width: WIDTH,
      height,
      bytes: pngBytes.byteLength,
      contentType,
      path,
    });

    return new Response(JSON.stringify({
      signedUrl: signedUrlData.signedUrl,
      path,
      diagnostics: {
        width: WIDTH,
        height,
        bytes: pngBytes.byteLength,
        contentType,
        path,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildNutritionTableSvg(result: Record<string, any>) {
  const perServing = result.per_serving ?? {};
  const per100 = result.per_100 ?? {};
  const vdPerServing = result.vd_per_serving ?? {};
  const servingSize = result.serving_size_g_ml ?? 0;
  const householdMeasure = result.household_measure ?? "1 porção";
  const unit = result.product_type === "liquid" ? "ml" : "g";

  const rows = [
    { label: "Valor energético", perServing: `${fmt(perServing.kcal)} kcal = ${fmt(perServing.kj)} kJ`, per100: `${fmt(per100.kcal)} kcal = ${fmt(per100.kj)} kJ`, vd: `${fmt(vdPerServing.kcal)}%`, thick: true },
    { label: "Carboidratos", perServing: `${fmt(perServing.carbs_g)} g`, per100: `${fmt(per100.carbs_g)} g`, vd: `${fmt(vdPerServing.carbs_g)}%` },
    { label: "Açúcares totais", perServing: `${fmt(perServing.sugars_total_g)} g`, per100: `${fmt(per100.sugars_total_g)} g`, vd: "-", indent: true },
    { label: "Açúcares adicionados", perServing: `${fmt(perServing.sugars_added_g)} g`, per100: `${fmt(per100.sugars_added_g)} g`, vd: `${fmt(vdPerServing.sugars_added_g)}%`, indent: true },
    { label: "Proteínas", perServing: `${fmt(perServing.protein_g)} g`, per100: `${fmt(per100.protein_g)} g`, vd: `${fmt(vdPerServing.protein_g)}%` },
    { label: "Gorduras totais", perServing: `${fmt(perServing.fat_total_g)} g`, per100: `${fmt(per100.fat_total_g)} g`, vd: `${fmt(vdPerServing.fat_total_g)}%` },
    { label: "Gorduras saturadas", perServing: `${fmt(perServing.sat_fat_g)} g`, per100: `${fmt(per100.sat_fat_g)} g`, vd: `${fmt(vdPerServing.sat_fat_g)}%`, indent: true },
    { label: "Gorduras trans", perServing: `${fmt(perServing.trans_fat_g)} g`, per100: `${fmt(per100.trans_fat_g)} g`, vd: "-", indent: true },
    { label: "Fibra alimentar", perServing: `${fmt(perServing.fiber_g)} g`, per100: `${fmt(per100.fiber_g)} g`, vd: `${fmt(vdPerServing.fiber_g)}%` },
    { label: "Sódio", perServing: `${fmt(perServing.sodium_mg)} mg`, per100: `${fmt(per100.sodium_mg)} mg`, vd: `${fmt(vdPerServing.sodium_mg)}%` },
  ];

  const rowHeight = 62;
  const tableTop = 240;
  const footnoteTop = tableTop + rows.length * rowHeight + 54;
  const height = footnoteTop + 120;

  const lineElements = rows.map((row, index) => {
    const y = tableTop + index * rowHeight;
    const borderWidth = row.thick ? 8 : 2;
    return `
      <line x1="72" y1="${y}" x2="1128" y2="${y}" stroke="#000000" stroke-width="${borderWidth}" />
      <text x="${row.indent ? 108 : 84}" y="${y + 40}" font-size="28" font-weight="${row.thick ? 700 : 400}" font-family="Arial, Helvetica, sans-serif">${esc(row.label)}</text>
      <text x="600" y="${y + 40}" font-size="28" font-family="Arial, Helvetica, sans-serif">${esc(row.perServing)}</text>
      <text x="830" y="${y + 40}" font-size="28" font-family="Arial, Helvetica, sans-serif">${esc(row.per100)}</text>
      <text x="1070" y="${y + 40}" text-anchor="end" font-size="28" font-family="Arial, Helvetica, sans-serif">${esc(row.vd)}</text>
    `;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="36" y="36" width="1128" height="${height - 72}" fill="#ffffff" stroke="#000000" stroke-width="4" />
    <text x="72" y="88" font-size="54" font-weight="700" font-family="Arial, Helvetica, sans-serif">INFORMAÇÃO NUTRICIONAL</text>
    <line x1="72" y1="110" x2="1128" y2="110" stroke="#000000" stroke-width="4" />
    <text x="72" y="156" font-size="28" font-family="Arial, Helvetica, sans-serif">Porção de ${esc(fmt(servingSize))}${unit} (${esc(String(householdMeasure))})</text>
    <line x1="72" y1="196" x2="1128" y2="196" stroke="#000000" stroke-width="2" />
    <text x="600" y="228" font-size="24" font-weight="700" font-family="Arial, Helvetica, sans-serif">Por porção</text>
    <text x="830" y="228" font-size="24" font-weight="700" font-family="Arial, Helvetica, sans-serif">Por 100${unit}</text>
    <text x="1070" y="228" text-anchor="end" font-size="24" font-weight="700" font-family="Arial, Helvetica, sans-serif">%VD*</text>
    ${lineElements}
    <line x1="72" y1="${tableTop + rows.length * rowHeight}" x2="1128" y2="${tableTop + rows.length * rowHeight}" stroke="#000000" stroke-width="2" />
    <text x="72" y="${footnoteTop}" font-size="20" font-family="Arial, Helvetica, sans-serif">* % Valores Diários com base em uma dieta de 2.000 kcal.</text>
    <text x="72" y="${footnoteTop + 30}" font-size="20" font-family="Arial, Helvetica, sans-serif">Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas.</text>
  </svg>`;

  return { svg, height };
}

function fmt(value: unknown) {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  if (typeof value === "string" && value.trim().length > 0) return value;
  return "0";
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tabela-nutricional";
}
