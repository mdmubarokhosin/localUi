import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuInfo, LuLayoutDashboard, LuFileText, LuCog, LuDownload, LuMenu, LuSquarePen, LuStar } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import LocalStorage from '../database/localStorage';
import { useAppContext } from '../store/app';
import { useChatContext } from '../store/chat';
import { useInferenceContext } from '../store/inference';
import { downloadFile, exportAsMarkdown } from '../utils/chat-export';
import { Button } from './Button';
import { Dropdown } from './Dropdown';
import { Icon } from './Icon';
import { Label } from './Label';


export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    config,
    config: { model },
    saveConfig,
    showSettings,
  } = useAppContext();
  const { models } = useInferenceContext();
  const { viewingChat } = useChatContext();
  const [showModelInfo, setShowModelInfo] = useState(false);

  const currConv = useMemo(() => viewingChat?.conv ?? null, [viewingChat]);
  const title = useMemo(
    () =>
      showSettings
        ? t('header.title.settings')
        : currConv
          ? currConv.name
          : t('header.title.noChat'),
    [t, currConv, showSettings]
  );

  // Sort models: favorites first, then alphabetically
  const sortedModels = useMemo(() => {
    const favs = new Set(LocalStorage.getModelFavorites());
    return [...models].sort((a, b) => {
      const aFav = favs.has(a.id) ? 0 : 1;
      const bFav = favs.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });
  }, [models]);

  const selectedModelObj = useMemo(
    () => models.find((m) => m.id === model),
    [models, model]
  );

  const selectedModelDisplay = useMemo(() => {
    const selectedModel = sortedModels.find((m) => m.id === model);
    const isFav = LocalStorage.isModelFavorite(model);
    return (
      <span className="max-w-64 sm:max-w-80 truncate text-nowrap font-semibold flex items-center gap-1">
        {isFav && <LuStar className="text-warning fill-warning h-3 w-3" />}
        {selectedModel ? selectedModel.name : <s>{model}</s>}
      </span>
    );
  }, [sortedModels, model]);

  const handleModelSelect = (option: { value: string }) => {
    saveConfig({ ...config, model: option.value });
  };

  const handleToggleFavorite = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    LocalStorage.toggleModelFavorite(modelId);
  };

  return (
    <header className="flex flex-col gap-2 justify-center max-md:pb-2 md:py-2 sticky top-0 z-10">
      <section className="flex flex-row items-center xl:hidden">
        <Label variant="btn-ghost" size="icon" htmlFor="toggle-drawer">
          <Icon size="md">
            <LuMenu />
          </Icon>
        </Label>
        <Label
          className="grow font-medium truncate px-4"
          aria-label={title}
          role="button"
          onClick={() => {
            if (showSettings) return;
            if (currConv) navigate(`/chat/${currConv.id}`);
            else navigate('/');
          }}
        >
          {title}
        </Label>
        <Button
          variant="ghost"
          size="icon-xl"
          onClick={() => navigate('/')}
          title={t('header.buttons.newConv')}
          aria-label={t('header.ariaLabels.newConv')}
        >
          <Icon size="md">
            <LuSquarePen />
          </Icon>
        </Button>
        <Button
          variant="ghost"
          size="icon-xl"
          title={t('header.buttons.settings')}
          aria-label={t('header.ariaLabels.settings')}
          onClick={() => navigate('/settings')}
        >
          <Icon size="md">
            <LuCog />
          </Icon>
        </Button>
      </section>

      {showSettings && (
        <section className="flex items-center max-xl:hidden">
          <Label className="font-medium truncate text-center px-4" aria-label={title}>
            {title}
          </Label>
        </section>
      )}

      {!showSettings && (
        <section className="flex flex-row items-center">
          <Dropdown
            className="ml-2 px-1 xl:px-4 py-0"
            entity="Model"
            options={sortedModels.map((m) => ({ value: m.id, label: m.name }))}
            filterable={true}
            hideChevron={models.length < 2}
            align="start"
            currentValue={selectedModelDisplay}
            renderOption={(option) => (
              <span className="max-w-64 sm:max-w-80 truncate text-nowrap flex items-center gap-2">
                <button
                  className="p-0 h-4 w-4 flex items-center justify-center"
                  onClick={(e) => handleToggleFavorite(e, option.value)}
                  title={LocalStorage.isModelFavorite(option.value) ? 'Unfavorite' : 'Favorite'}
                >
                  <LuStar
                    className={`h-3.5 w-3.5 ${
                      LocalStorage.isModelFavorite(option.value)
                        ? 'text-warning fill-warning'
                        : 'opacity-30'
                    }`}
                  />
                </button>
                {option.label}
              </span>
            )}
            isSelected={(option) => model === option.value}
            onSelect={handleModelSelect}
          />

          {/* Model info button */}
          {selectedModelObj && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowModelInfo(true)}
              title={t('settings.modelInfo.title')}
            >
              <Icon size="sm">
                <LuInfo />
              </Icon>
            </Button>
          )}

          <div className="grow"></div>

          <div className="flex items-center">
            {currConv && viewingChat?.messages && (
              <Button
                variant="ghost"
                size="icon-xl"
                title="Export Chat"
                onClick={() => {
                  const md = exportAsMarkdown(
                    [...viewingChat.messages] as any[],
                    currConv.name
                  );
                  downloadFile(md, `${currConv.name}.md`, 'text/markdown');
                }}
              >
                <Icon size="md"><LuDownload /></Icon>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon-xl"
              title="Dashboard"
              onClick={() => navigate('/dashboard')}
            >
              <Icon size="md"><LuLayoutDashboard /></Icon>
            </Button>

            <Button
              variant="ghost"
              size="icon-xl"
              title="Templates"
              onClick={() => navigate('/templates')}
            >
              <Icon size="md"><LuFileText /></Icon>
            </Button>

            <Button
              variant="ghost"
              size="icon-xl"
              className="max-xl:hidden"
              title={t('header.buttons.settings')}
              aria-label={t('header.ariaLabels.settings')}
              onClick={() => navigate('/settings')}
            >
              <Icon size="md"><LuCog /></Icon>
            </Button>
          </div>
        </section>
      )}

      {/* Model Info Dialog */}
      {showModelInfo && selectedModelObj && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowModelInfo(false)}>
          <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{t('settings.modelInfo.title')}</h3>
            <div className="space-y-2 text-sm">
              <div><b>{t('settings.modelInfo.id')}:</b> {selectedModelObj.id}</div>
              <div><b>{t('settings.modelInfo.name')}:</b> {selectedModelObj.name}</div>
              {selectedModelObj.modalities && (
                <div><b>{t('settings.modelInfo.modalities')}:</b> {selectedModelObj.modalities.join(', ')}</div>
              )}
              {selectedModelObj.description && (
                <div><b>Description:</b> {selectedModelObj.description}</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setShowModelInfo(false)}>
                {t('modals.cancelBtnLabel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
