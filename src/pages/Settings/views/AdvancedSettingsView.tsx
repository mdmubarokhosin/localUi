import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCog, LuCpu, LuFilter, LuHand, LuRefreshCw, LuServer } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { Icon } from '../../../components';
import { Button } from '../../../components/Button';
import { ConfigurationKey, Configuration } from '../../../types';
import { useAppContext } from '../../../store/app';
import { SettingInputType } from '../../../types/settings';
import {
  DelimeterComponent,
  SettingsModalCheckbox,
  SettingsModalLongInput,
  SettingsModalShortInput,
  SettingsSectionLabel,
} from '../components';
import { SettingsTabViewProps } from '../types';

const generationKeys: ConfigurationKey[] = [
  'temperature',
  'top_k',
  'top_p',
  'min_p',
  'max_tokens',
  'seed',
];

const samplerKeys: ConfigurationKey[] = [
  'samplers',
  'dynatemp_range',
  'dynatemp_exponent',
  'typical_p',
  'xtc_probability',
  'xtc_threshold',
];

const penaltyKeys: ConfigurationKey[] = [
  'repeat_last_n',
  'repeat_penalty',
  'presence_penalty',
  'frequency_penalty',
  'dry_multiplier',
  'dry_base',
  'dry_allowed_length',
  'dry_penalty_last_n',
  'n_keep',
];

export function AdvancedSettingsView({
  config,
  onConfigChange,
}: SettingsTabViewProps) {
  const { t } = useTranslation();
  const { saveConfig } = useAppContext();
  const [serverProps, setServerProps] = useState<Record<string, unknown> | null>(null);
  const [loadingProps, setLoadingProps] = useState(false);

  const fetchServerProps = useCallback(async () => {
    if (!config.baseUrl) return;
    setLoadingProps(true);
    try {
      const response = await fetch(
        `${config.baseUrl.replace(/\/$/, '')}/props`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setServerProps(data);
      toast.success(t('settings.actionButtons.serverPropsLoaded'));
    } catch (err) {
      console.error('Failed to fetch server props:', err);
      toast.error('Failed to fetch server properties. Is the server running?');
    } finally {
      setLoadingProps(false);
    }
  }, [config.baseUrl, t]);

  const resetToServerDefaults = useCallback(() => {
    if (!serverProps) return;
    const overrides: Partial<Configuration> = {};
    for (const key of generationKeys) {
      if (key in serverProps) {
        (overrides as Record<string, unknown>)[key] = serverProps[key];
      }
    }
    saveConfig({ ...config, ...overrides });
    toast.success('Reset to server defaults');
  }, [serverProps, config, saveConfig]);

  const differsFromServer = (key: ConfigurationKey): boolean => {
    if (!serverProps || !(key in serverProps)) return false;
    return JSON.stringify(config[key]) !== JSON.stringify(serverProps[key]);
  };

  // Only show server props for llama.cpp-compatible providers
  const isLlamaCppProvider = ['llamacpp', 'lmstudio', 'ollama'].includes(
    config.provider
  );

  return (
    <>
      <SettingsSectionLabel>
        <Icon size="sm" variant="leftside">
          <LuCog />
        </Icon>
        {t('settings.sections.generation')}
      </SettingsSectionLabel>

      <SettingsModalCheckbox
        field={{
          type: SettingInputType.CHECKBOX,
          key: 'overrideGenerationOptions',
        }}
        value={!!config.overrideGenerationOptions}
        onChange={onConfigChange('overrideGenerationOptions')}
      />

      {generationKeys.map((configKey) => (
        <div key={configKey} className={differsFromServer(configKey) ? 'tooltip tooltip-right' : ''} data-tip={t('settings.serverProps.differsFromDefault')}>
          <div className={differsFromServer(configKey) ? 'border-l-2 border-warning pl-2' : ''}>
            <SettingsModalShortInput
              key={configKey}
              field={{
                type: SettingInputType.SHORT_INPUT,
                key: configKey,
                disabled: !config.overrideGenerationOptions,
              }}
              value={config[configKey] as string | number}
              onChange={onConfigChange(configKey)}
            />
          </div>
        </div>
      ))}

      <SettingsModalCheckbox
        field={{
          type: SettingInputType.CHECKBOX,
          key: 'jsonMode',
          disabled: !config.overrideGenerationOptions,
        }}
        value={!!config.jsonMode}
        onChange={onConfigChange('jsonMode')}
      />

      <DelimeterComponent />

      <SettingsSectionLabel>
        <Icon size="sm" variant="leftside">
          <LuFilter />
        </Icon>
        {t('settings.sections.samplers')}
      </SettingsSectionLabel>

      <SettingsModalCheckbox
        field={{
          type: SettingInputType.CHECKBOX,
          key: 'overrideSamplersOptions',
        }}
        value={!!config.overrideSamplersOptions}
        onChange={onConfigChange('overrideSamplersOptions')}
      />

      {samplerKeys.map((configKey) => (
        <SettingsModalShortInput
          key={configKey}
          field={{
            type: SettingInputType.SHORT_INPUT,
            key: configKey,
            disabled: !config.overrideSamplersOptions,
          }}
          value={config[configKey] as string | number}
          onChange={onConfigChange(configKey)}
        />
      ))}

      <DelimeterComponent />

      <SettingsSectionLabel>
        <Icon size="sm" variant="leftside">
          <LuHand />
        </Icon>
        {t('settings.sections.penalties')}
      </SettingsSectionLabel>

      <SettingsModalCheckbox
        field={{
          type: SettingInputType.CHECKBOX,
          key: 'overridePenaltyOptions',
        }}
        value={!!config.overridePenaltyOptions}
        onChange={onConfigChange('overridePenaltyOptions')}
      />

      {penaltyKeys.map((configKey) => (
        <SettingsModalShortInput
          key={configKey}
          field={{
            type: SettingInputType.SHORT_INPUT,
            key: configKey,
            disabled: !config.overridePenaltyOptions,
          }}
          value={config[configKey] as string | number}
          onChange={onConfigChange(configKey)}
        />
      ))}

      <DelimeterComponent />

      <SettingsSectionLabel>
        <Icon size="sm" variant="leftside">
          <LuCpu />
        </Icon>
        {t('settings.sections.custom')}
      </SettingsSectionLabel>

      <SettingsModalLongInput
        field={{ type: SettingInputType.LONG_INPUT, key: 'custom' }}
        value={String(config.custom)}
        onChange={onConfigChange('custom')}
      />

      {/* Server Properties Sync */}
      {isLlamaCppProvider && (
        <>
          <DelimeterComponent />
          <SettingsSectionLabel>
            <Icon size="sm" variant="leftside">
              <LuServer />
            </Icon>
            {t('settings.sections.serverProperties')}
          </SettingsSectionLabel>

          <div className="text-sm opacity-70 mb-2" dangerouslySetInnerHTML={{ __html: t('settings.serverProps.note') }} />

          <div className="flex gap-2">
            <Button
              variant="neutral"
              onClick={fetchServerProps}
              disabled={loadingProps}
            >
              {loadingProps ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Icon size="sm" variant="leftside">
                  <LuRefreshCw />
                </Icon>
              )}
              {t('settings.actionButtons.fetchServerProps')}
            </Button>
            {serverProps && (
              <Button variant="neutral" onClick={resetToServerDefaults}>
                {t('settings.actionButtons.resetToServerDefaults')}
              </Button>
            )}
          </div>

          {serverProps && (
            <div className="mt-2 bg-base-200 rounded-lg p-3 text-xs max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(serverProps, null, 2)}
              </pre>
            </div>
          )}

          {!serverProps && !loadingProps && (
            <div className="text-xs opacity-50">
              {t('settings.serverProps.noServerProps')}
            </div>
          )}
        </>
      )}
    </>
  );
}
