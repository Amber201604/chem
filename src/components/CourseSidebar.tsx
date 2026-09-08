import { useI18n } from '../i18n/I18nProvider'

export type CourseId = 'formula' | 'battery' | 'digest'

type Props = {
  activeCourse: CourseId
  collapsed: boolean
  onSelect: (course: CourseId) => void
  onToggle: () => void
}

const courses: Array<{ id: CourseId; number: string; icon: string }> = [
  { id: 'formula', number: '02.4', icon: '⚛' },
  { id: 'battery', number: '03.1', icon: '⚡' },
  { id: 'digest', number: '04.1', icon: '🍅' },
]

export function CourseSidebar({
  activeCourse,
  collapsed,
  onSelect,
  onToggle,
}: Props) {
  const { t } = useI18n()

  return (
    <aside className={`course-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="course-sidebar__head">
        {!collapsed && (
          <div>
            <strong>{t('nav.title')}</strong>
            <span>{t('nav.subtitle')}</span>
          </div>
        )}
        <button
          type="button"
          className="course-sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav aria-label={t('nav.title')}>
        {courses.map((course) => (
          <button
            type="button"
            key={course.id}
            className={`course-nav-item ${
              activeCourse === course.id ? 'is-active' : ''
            }`}
            onClick={() => onSelect(course.id)}
            title={collapsed ? t(`nav.${course.id}`) : undefined}
          >
            <span className="course-nav-item__icon" aria-hidden="true">
              {course.icon}
            </span>
            {!collapsed && (
              <span className="course-nav-item__copy">
                <small>{course.number}</small>
                <strong>{t(`nav.${course.id}`)}</strong>
                <span>{t(`nav.${course.id}Desc`)}</span>
              </span>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && <p className="course-sidebar__note">{t('nav.note')}</p>}
    </aside>
  )
}
