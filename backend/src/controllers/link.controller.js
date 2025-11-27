/**
 * Get link preview metadata
 */
async function getLinkPreview(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Basic validation
    new URL(url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SynapseBot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Simple regex to extract OG tags
    const getMetaTag = (name) => {
      const regex = new RegExp(`<meta\\s+(?:property|name)=["']og:${name}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    const getTitle = () => {
      const ogTitle = getMetaTag('title');
      if (ogTitle) return ogTitle;
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      return titleMatch ? titleMatch[1] : null;
    };

    const getDescription = () => {
        const ogDesc = getMetaTag('description');
        if (ogDesc) return ogDesc;
        const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        return metaDesc ? metaDesc[1] : null;
    }

    const title = getTitle() || url;
    const description = getDescription() || '';
    const imageUrl = getMetaTag('image') || null;

    res.json({
      url,
      title,
      description,
      imageUrl
    });

  } catch (error) {
    console.error('Link preview error:', error);
    res.status(500).json({ error: 'Failed to fetch link preview', details: error.message });
  }
}

module.exports = {
  getLinkPreview
};
