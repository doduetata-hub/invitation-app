import Icon from './Icon';

export default function SearchField({ label, className = '', ...props }) {
  return (
    <div className="search-field">
      <Icon name="search" />
      <input type="text" aria-label={label || props.placeholder} className={`input ${className}`.trim()} {...props} />
    </div>
  );
}
