import { CSSProperties, forwardRef } from 'react';
import { NutritionLabel } from '@/components/NutritionLabel';
import { FrontWarningSeals } from '@/components/FrontWarningSeals';
import { FrontWarning, NutritionResult } from '@/lib/nutrition-engine';

const hiddenStageStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  transform: 'translateX(-200vw)',
  pointerEvents: 'none',
  zIndex: -1,
  opacity: 1,
};

const exportSurfaceStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#000000',
  padding: '24px',
};

export const NutritionTableExportStage = forwardRef<HTMLDivElement, { result: NutritionResult }>(
  ({ result }, ref) => (
    <div aria-hidden="true" style={hiddenStageStyle}>
      <div ref={ref} data-export-surface="nutrition-table" style={exportSurfaceStyle}>
        <NutritionLabel result={result} />
      </div>
    </div>
  ),
);

NutritionTableExportStage.displayName = 'NutritionTableExportStage';

export const FrontWarningExportStage = forwardRef<HTMLDivElement, { warnings: FrontWarning }>(
  ({ warnings }, ref) => (
    <div aria-hidden="true" style={hiddenStageStyle}>
      <div
        ref={ref}
        data-export-surface="front-warnings"
        style={{
          ...exportSurfaceStyle,
          width: '520px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <FrontWarningSeals warnings={warnings} />
      </div>
    </div>
  ),
);

FrontWarningExportStage.displayName = 'FrontWarningExportStage';
