import axios from 'axios';


export async function fetchRandomAvatar(): Promise<string> {
  try {
    // Generate a random seed for the avatar
    const seed = Math.random().toString(36).substring(7);

    // Make an HTTP GET request to DiceBear API
    const response = await axios.get(`https://avatars.dicebear.com/api/pixel-art/${seed}.svg`, {
      params: {
        options: {
          background: '%23f0f0f0', // Light gray background (URL encoded)
          margin: 10,             // Adds margin around the avatar
        },
      },
    });

    // Return the avatar as a data URL
    return `data:image/svg+xml;utf8,${encodeURIComponent(response.data)}`;
  } catch (error) {
    console.error('Error fetching avatar:', error);
    // Fallback to default DiceBear avatar URL
    return 'https://avatars.dicebear.com/api/pixel-art/default.svg';
  }
}
