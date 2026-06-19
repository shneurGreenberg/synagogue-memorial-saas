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

function getPhotoCropStyle(person) {
  const crop = person && person.photoCrop;
  const x = typeof crop?.x === 'number' ? crop.x : 50;
  const y = typeof crop?.y === 'number' ? crop.y : 50;
  const zoom = typeof crop?.zoom === 'number' ? crop.zoom : 1;

  return {
    objectFit: 'cover',
    objectPosition: `${x}% ${y}%`,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  };
}

class PersonAvatar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { imageFailed: false };
    this.onImageError = this.onImageError.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.person !== this.props.person
      || prevProps.person?.photo !== this.props.person?.photo
      || prevProps.person?.photoCrop !== this.props.person?.photoCrop
    ) {
      this.setState({ imageFailed: false });
    }
  }

  onImageError() {
    this.setState({ imageFailed: true });
  }

  render() {
    const { person, size = 'md', className = '' } = this.props;

    if (!person) {
      return null;
    }

    const classes = `person-avatar person-avatar-${size} ${className}`.trim();
    const name = person.name || '';
    const showPhoto = person.photo && !this.state.imageFailed;

    if (showPhoto) {
      return (
        <img
          src={`/photos/${person.photo}`}
          alt={name}
          className={classes}
          style={getPhotoCropStyle(person)}
          onError={this.onImageError}
        />
      );
    }

    return (
      <span className={`${classes} person-avatar-placeholder`} aria-hidden="true">
        {getInitials(name)}
      </span>
    );
  }
}

module.exports = {
  PersonAvatar,
  getInitials,
};
