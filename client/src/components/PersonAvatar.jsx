import React from 'react';

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

export class PersonAvatar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { imageFailed: false };
    this.onImageError = this.onImageError.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.person !== this.props.person || prevProps.person?.photo !== this.props.person?.photo) {
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
          onError={this.onImageError}
          loading="eager"
          decoding="async"
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
