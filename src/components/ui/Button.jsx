import Icon from './Icon';

/**
 * Button following the Genesis spec: primary | secondary | ghost | danger,
 * sizes sm (32px) | md (38px) | lg (44px). `loading` keeps the width stable,
 * disables the button and announces the busy state.
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  block = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Icon name="loader" className="spin" /> : icon && <Icon name={icon} />}
      {children && <span>{children}</span>}
      {iconAfter && !loading && <Icon name={iconAfter} />}
    </button>
  );
}
