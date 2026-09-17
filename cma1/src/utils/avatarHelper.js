const DEFAULT_SAFE_AVATAR = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="128" height="128">
    <circle cx="50" cy="50" r="48" fill="#182229" stroke="#00a884" stroke-width="2"/>
    <circle cx="50" cy="38" r="18" fill="#00a884" opacity="0.85"/>
    <path d="M22 84 C24 64, 76 64, 78 84 Z" fill="#00a884" opacity="0.85"/>
  </svg>`
)}`;

export const getAvatarSrc = (avatar) => {
  if (!avatar || typeof avatar !== 'string') return DEFAULT_SAFE_AVATAR;
  const trimmed = avatar.trim();
  if (!trimmed) return DEFAULT_SAFE_AVATAR;
  
  // If already a full Data URL or web URL
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Detect SVG Base64 (starts with PHN2Zy, PD94bWw, etc.)
  if (
    trimmed.startsWith('PHN2Z') ||
    trimmed.startsWith('PD94bW') ||
    trimmed.startsWith('<svg') ||
    trimmed.startsWith('%3Csvg')
  ) {
    return `data:image/svg+xml;base64,${trimmed}`;
  }

  // Detect JPEG Base64
  if (trimmed.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  // Detect PNG Base64
  if (trimmed.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${trimmed}`;
  }

  // Detect WebP Base64
  if (trimmed.startsWith('UklGR')) {
    return `data:image/webp;base64,${trimmed}`;
  }

  // Detect GIF Base64
  if (trimmed.startsWith('R0lGOD')) {
    return `data:image/gif;base64,${trimmed}`;
  }

  // Default fallback
  return `data:image/svg+xml;base64,${trimmed}`;
};
