import * as CryptoJS from 'crypto-js';

interface GravatarProps {
  email: string;
  size: number;
  name: string;
}

function Gravatar({ email, size, name }: GravatarProps) {
  const hashedEmail = CryptoJS.MD5(email.toLowerCase()).toString();
  const gravatarUrl = `https://www.gravatar.com/avatar/${hashedEmail}?s=${size}`;

  return (
    <figure>
      <img src={gravatarUrl} alt={name} />
      <figcaption>{name}</figcaption>
    </figure>
  );
}

export default Gravatar;
