import React from 'react';
import { photoUrl, isStaticSite } from '../lib/asset-url';

const PHOTO_WIDTH_BY_SIZE = {
  sm: 96,
  md: 128,
  lg: 192,
  xl: 400,
};

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

function getPhotoCropStyle(person, useServerCrop) {
  if (useServerCrop) {
    return {
      objectFit: 'cover',
      objectPosition: 'center center',
    };
  }

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

function personPhotoSignature(person) {
  if (!person) {
    return '';
  }

  const crop = person.photoCrop || {};
  return [
    person.id,
    person.photo || '',
    crop.x,
    crop.y,
    crop.zoom,
  ].join('|');
}

export class PersonAvatar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      imageFailed: false,
      imageLoaded: false,
      useFullSize: false,
    };
    this.onImageError = this.onImageError.bind(this);
    this.onImageLoad = this.onImageLoad.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (personPhotoSignature(prevProps.person) !== personPhotoSignature(this.props.person)) {
      this.setState({
        imageFailed: false,
        imageLoaded: false,
        useFullSize: false,
      });
    }
  }

  onImageError() {
    if (!this.state.useFullSize) {
      this.setState({ useFullSize: true, imageLoaded: false });
      return;
    }

    this.setState({ imageFailed: true, imageLoaded: false });
  }

  onImageLoad() {
    this.setState({ imageLoaded: true });
  }

  render() {
    const { person, size = 'md', className = '' } = this.props;

    if (!person) {
      return null;
    }

    const classes = `person-avatar person-avatar-${size} ${className}`.trim();
    const name = person.name || '';
    const showPhoto = person.photo && !this.state.imageFailed;
    const photoWidth = PHOTO_WIDTH_BY_SIZE[size] || PHOTO_WIDTH_BY_SIZE.md;
    const initials = getInitials(name);
    const { imageLoaded, useFullSize } = this.state;
    const useServerCrop = !useFullSize && !isStaticSite();
    const cropStyle = getPhotoCropStyle(person, useServerCrop);

    if (showPhoto) {
      const src = useFullSize
        ? photoUrl(person.photo)
        : photoUrl(person.photo, {
          width: photoWidth,
          crop: useServerCrop ? person.photoCrop : undefined,
        });

      return (
        <span className={`${classes} person-avatar-wrap${imageLoaded ? ' is-loaded' : ''}`} aria-label={name}>
          <span className="person-avatar-placeholder person-avatar-inner" aria-hidden="true">
            {initials}
          </span>
          <img
            key={src}
            src={src}
            alt=""
            className={`person-avatar-photo ${imageLoaded ? 'is-loaded' : 'is-loading'}`.trim()}
            style={cropStyle}
            onError={this.onImageError}
            onLoad={this.onImageLoad}
            loading="lazy"
            decoding="async"
          />
        </span>
      );
    }

    return (
      <span className={`${classes} person-avatar-placeholder`} aria-hidden="true">
        {initials}
      </span>
    );
  }
}
