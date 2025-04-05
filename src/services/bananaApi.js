export async function fetchBananaPuzzle() {
    try {
      const response = await fetch('https://marcconrad.com/uob/banana/api.php');
      if (!response.ok) {
        throw new Error('Failed to fetch puzzle');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      throw error;
    }
  }
  