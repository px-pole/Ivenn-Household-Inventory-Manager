import { useEffect } from 'react'
import { BookOpen, ExternalLink, FileText, GitBranch, Info, Scale, ShieldCheck, X } from 'lucide-react'
import { open } from '@tauri-apps/plugin-shell'
import packageInfo from '../package.json'
import { useTranslation } from 'react-i18next'
import { useTheme } from './useTheme'

const links = {
  repository: 'https://github.com/px-pole/Ivenn',
  issues: 'https://github.com/px-pole/Ivenn/issues',
  releases: 'https://github.com/px-pole/Ivenn/releases',
  changelog: 'https://github.com/px-pole/Ivenn/blob/main/CHANGELOG.md',
  license: 'https://github.com/px-pole/Ivenn/blob/main/LICENSE',
}

type Props = {
  onClose: () => void
}

export function AboutDialog({ onClose }: Props) {
  const { t } = useTranslation()
  const [theme] = useTheme()

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function openLink(url: string) {
    try {
      await open(url)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <header className="dialog-header">
          <div><p className="eyebrow">{t('about.eyebrow')}</p><h2 id="about-title">{t('about.title')}</h2></div>
          <button className="icon-button" type="button" title={t('action.close')} aria-label={t('action.close')} onClick={onClose}><X size={19} /></button>
        </header>
        <div className="about-content">
          <div className="about-identity">
            <img className="about-logo" src={`/branding/ivenn-${theme}.png`} alt="" />
            <div><h3>{t('app.name')}</h3><p>{t('app.tagline')}</p></div>
          </div>
          <p className="about-privacy"><ShieldCheck size={17} />{t('about.privacy')}</p>
          <div className="about-links">
            <button type="button" onClick={() => void openLink(links.repository)}><GitBranch size={17} />{t('about.repository')}<ExternalLink size={14} /></button>
            <button type="button" onClick={() => void openLink(links.issues)}><Info size={17} />{t('about.reportIssue')}<ExternalLink size={14} /></button>
            <button type="button" onClick={() => void openLink(links.releases)}><FileText size={17} />{t('about.checkUpdates')}<ExternalLink size={14} /></button>
            <button type="button" onClick={() => void openLink(links.changelog)}><BookOpen size={17} />{t('about.changelog')}<ExternalLink size={14} /></button>
            <button type="button" onClick={() => void openLink(links.license)}><Scale size={17} />{t('about.license')}<ExternalLink size={14} /></button>
          </div>
          <div className="about-version"><span>{t('about.version')}</span><strong>v{packageInfo.version}</strong></div>
        </div>
      </section>
    </div>
  )
}
