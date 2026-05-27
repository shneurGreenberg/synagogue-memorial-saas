const React = require('react');

function getInitials(name) {
  if (!name) {
    return '?';
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function PersonAvatar({ person, size = 'md', className = '' }) {
  if (!person) {
    return null;
  }

  const classes = `person-avatar person-avatar-${size} ${className}`.trim();
  const name = person.name || '';

  if (person.photo) {
    return (
      <img
        src={`/photos/${person.photo}`}
        alt={name}
        className={classes}
      />
    );
  }

  return (
    <span className={`${classes} person-avatar-placeholder`} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}

module.exports = {
  PersonAvatar,
  getInitials,
};
