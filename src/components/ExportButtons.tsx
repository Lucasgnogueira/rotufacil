import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Loader2, FileText, Image, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  exportPngToStorage,
  exportFullPdf,
  getCachedExport,
  ExportType,
} from '@/lib/export-service';

interface ExportButtonsProps {
  tableRef: React.RefObject<HTMLDivElement>;
  sealsRef: React.RefObject<HTMLDivElement>;
  versionId: string | null;
  recipeName: string;
  ingredientsList: string;
  allergenDecl: string;
  hasSeals: boolean;
}

type LoadingState = Record<ExportType, boolean>;

export function ExportButtons({
  tableRef,
  sealsRef,
  versionId,
  recipeName,
  ingredientsList,
  allergenDecl,
  hasSeals,
}: ExportButtonsProps) {
  const { user, subscription } = useAuth();
  const [loading, setLoading] = useState<LoadingState>({
    table_png: false,
    seals_png: false,
    full_pdf: false,
  });

  const setTypeLoading = (type: ExportType, val: boolean) =>
    setLoading((prev) => ({ ...prev, [type]: val }));

  const downloadFromUrl = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleExport = async (type: ExportType, regenerate = false) => {
    if (!versionId || !user) {
      toast.error('Calcule a receita primeiro para gerar uma versão.');
      return;
    }

    setTypeLoading(type, true);
    try {
      // Check cache first
      if (!regenerate) {
        const cached = await getCachedExport(versionId, type);
        if (cached) {
          const ext = type === 'full_pdf' ? 'pdf' : 'png';
          downloadFromUrl(cached, `${recipeName}.${ext}`);
          toast.success('Download iniciado!');
          setTypeLoading(type, false);
          return;
        }
      }

      let url: string;
      if (type === 'table_png') {
        if (!tableRef.current) throw new Error('Tabela não encontrada');
        url = await exportPngToStorage(tableRef.current, versionId, user.id, 'table_png', recipeName);
      } else if (type === 'seals_png') {
        if (!sealsRef.current) throw new Error('Selos não encontrados');
        url = await exportPngToStorage(sealsRef.current, versionId, user.id, 'seals_png', recipeName);
      } else {
        if (!tableRef.current) throw new Error('Tabela não encontrada');
        url = await exportFullPdf(
          tableRef.current,
          sealsRef.current || null,
          ingredientsList,
          allergenDecl,
          versionId,
          user.id,
          recipeName,
        );
      }

      const ext = type === 'full_pdf' ? 'pdf' : 'png';
      downloadFromUrl(url, `${recipeName}.${ext}`);
      toast.success('Exportação concluída!');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(`Erro na exportação: ${err.message || 'Tente novamente'}`);
    } finally {
      setTypeLoading(type, false);
    }
  };

  if (!subscription.subscribed) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
        <Crown className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 font-medium text-card-foreground">Recurso premium</p>
        <p className="mb-3 text-sm text-muted-foreground">
          A exportação em PNG e PDF está disponível nos planos pagos.
        </p>
        <Link to="/pricing">
          <Button className="gap-2"><Crown className="h-4 w-4" /> Ver planos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleExport('table_png')}
          disabled={loading.table_png}
          className="gap-2"
        >
          {loading.table_png ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
          Baixar Tabela (PNG)
        </Button>

        {hasSeals && (
          <Button
            onClick={() => handleExport('seals_png')}
            disabled={loading.seals_png}
            variant="outline"
            className="gap-2"
          >
            {loading.seals_png ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            Baixar Alto Em (PNG)
          </Button>
        )}

        <Button
          onClick={() => handleExport('full_pdf')}
          disabled={loading.full_pdf}
          variant="outline"
          className="gap-2"
        >
          {loading.full_pdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Baixar PDF Completo
        </Button>
      </div>

      {versionId && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport('table_png', true)}
            disabled={loading.table_png}
            className="gap-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3 w-3" /> Regenerar PNG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport('full_pdf', true)}
            disabled={loading.full_pdf}
            className="gap-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3 w-3" /> Regenerar PDF
          </Button>
        </div>
      )}
    </div>
  );
}
