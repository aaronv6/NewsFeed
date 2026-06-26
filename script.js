function toggleSource(sourceKey) {
    const idx = activeSources.indexOf(sourceKey);
    if (idx > -1) {
        if (activeSources.length > 1) {
            activeSources.splice(idx, 1);
        }
    } else {
        activeSources.push(sourceKey);
    }
    updateSourceButtons();
    refreshNews();
}

function updateSourceButtons() {
    Object.keys(newsSources).forEach(key => {
        const btn = document.getElementById(`source-${key}`);
        if (btn) {
            if (activeSources.includes(key)) {
                btn.classList.remove('bg-gray-800', 'text-gray-400');
                btn.classList.add('bg-blue-600', 'text-white');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-800', 'text-gray-400');
            }
        }
    });
}

function setCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.cat === category) {
            btn.className = 'category-btn bg-blue-600 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap';
        } else {
            btn.className = 'category-btn bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap';
        }
    });
    refreshNews();
}

// US News RSS feeds - free, no API key
const newsSources = {
    'npr': {
        name: 'NPR',
        feeds: {
            'top': ['https://feeds.npr.org/1001/rss.xml'],
            'technology': ['https://feeds.npr.org/1019/rss.xml'],
            'business': ['https://feeds.npr.org/1006/rss.xml'],
            'science': ['https://feeds.npr.org/1007/rss.xml'],
            'health': ['https://feeds.npr.org/1033/rss.xml'],
            'sports': ['https://feeds.npr.org/1055/rss.xml'],
            'entertainment': ['https://feeds.npr.org/1048/rss.xml']
        }
    },
    'fox': {
        name: 'Fox News',
        feeds: {
            'top': ['https://moxie.foxnews.com/google-publisher/latest.xml'],
            'technology': ['https://moxie.foxnews.com/google-publisher/tech.xml'],
            'business': ['https://moxie.foxnews.com/google-publisher/money.xml'],
            'health': ['https://moxie.foxnews.com/google-publisher/health.xml'],
            'sports': ['https://moxie.foxnews.com/google-publisher/sports.xml'],
            'entertainment': ['https://moxie.foxnews.com/google-publisher/entertainment.xml']
        }
    },
    'cbs': {
        name: 'CBS News',
        feeds: {
            'top': ['https://www.cbsnews.com/latest/rss/main'],
            'technology': ['https://www.cbsnews.com/latest/rss/technology'],
            'business': ['https://www.cbsnews.com/latest/rss/moneywatch'],
            'health': ['https://www.cbsnews.com/latest/rss/health'],
            'politics': ['https://www.cbsnews.com/latest/rss/politics']
        }
    },
    'abc': {
        name: 'ABC News',
        feeds: {
            'top': ['https://abcnews.go.com/abcnews/topstories'],
            'technology': ['https://abcnews.go.com/abcnews/technology'],
            'business': ['https://abcnews.go.com/abcnews/money'],
            'health': ['https://abcnews.go.com/abcnews/health'],
            'politics': ['https://abcnews.go.com/abcnews/politics']
        }
    },
};

let activeSources = ['npr', 'fox', 'cbs', 'abc'];
let currentCategory = 'top';

// CORS proxies - try several public proxies; prefer those that accept a raw URL
const corsProxies = [
    'http://localhost:8080/fetch?url=',       // local dev proxy (optional)
    'https://api.allorigins.win/raw?url=',    // requires encoded URL
    'https://thingproxy.freeboard.io/fetch/', // append raw URL
    'https://r.jina.ai/http://'
];

function buildProxyUrl(proxy, feedUrl) {
    // If the proxy expects an encoded URL param (contains "?url=" or "raw?url=")
    if (proxy.includes('?url=') || proxy.includes('raw?url=')) {
        return `${proxy}${encodeURIComponent(feedUrl)}`;
    }

    // Otherwise append the feed URL directly (proxy will fetch it as-is)
    return `${proxy}${feedUrl}`;
}

// Cache for article images to avoid refetching
const imageCache = new Map();

// Try to fetch article image from Open Graph meta tag
async function fetchArticleImage(url) {
    if (imageCache.has(url)) return imageCache.get(url);

    try {
        const html = await fetchFeed(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const ogImage = doc.querySelector('meta[property="og:image"]')?.content;
        if (ogImage) {
            imageCache.set(url, ogImage);
            return ogImage;
        }

        const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.content;
        if (twitterImage) {
            imageCache.set(url, twitterImage);
            return twitterImage;
        }

        imageCache.set(url, null);
        return null;
    } catch (e) {
        imageCache.set(url, null);
        return null;
    }
}

// Extract article content for reader view
async function fetchReaderContent(url) {
    try {
        const html = await fetchFeed(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const selectors = [
            '#storytext',
            '.storytext',
            '[data-testid="paragraph"]',
            'div[data-testid]',
            '.article-body',
            '.article-content',
            '.article-text',
            '[class*="article-body"]',
            'article',
            '[role="main"]',
            '.story-body',
            'main',
            '.content',
            '#content'
        ];

        let container = null;
        let bestContainer = null;
        let maxParagraphs = 0;

        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) {
                const pCount = el.querySelectorAll('p').length;
                if (pCount > maxParagraphs) {
                    maxParagraphs = pCount;
                    bestContainer = el;
                }
                if (pCount > 3) {
                    container = el;
                    break;
                }
            }
        }

        container = container || bestContainer || doc.body;

        const paragraphs = container.querySelectorAll('p');
        const text = Array.from(paragraphs)
            .map(p => {
                const clone = p.cloneNode(true);
                clone.querySelectorAll('script, style, nav, aside').forEach(el => el.remove());
                return clone.textContent.trim();
            })
            .filter(t => {
                if (t.length < 40) return false;
                const lower = t.toLowerCase();
                const skipPhrases = ['advertisement', 'read more', 'click here', 'subscribe', 'sign up', 'cookie', 'privacy policy'];
                return !skipPhrases.some(phrase => lower.includes(phrase));
            })
            .join('\n\n');

        const image = doc.querySelector('meta[property="og:image"]')?.content ||
            doc.querySelector('meta[name="twitter:image"]')?.content ||
            container.querySelector('img[src*="npr.org"]')?.src ||
            container.querySelector('img')?.src;

        if (!text || text.length < 100) {
            console.log('Insufficient content extracted from:', url, 'Length:', text?.length);
            const bodyText = doc.body?.textContent?.trim();
            if (bodyText && bodyText.length > 500) {
                return { text: bodyText.substring(0, 5000), image, title: doc.title };
            }
            return null;
        }

        return { text, image, title: doc.title };
    } catch (e) {
        console.log('Reader view error:', url, e.message);
        return null;
    }
}

function parseRSS(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = xml.querySelectorAll('item');
    const articles = [];

    items.forEach(item => {
        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const source = xml.querySelector('channel title')?.textContent || 'News';

        let imageUrl = null;

        const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
        if (mediaContent) {
            imageUrl = mediaContent.getAttribute('url');
        }

        if (!imageUrl) {
            const enclosure = item.querySelector('enclosure');
            if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
                imageUrl = enclosure.getAttribute('url');
            }
        }

        if (!imageUrl) {
            const contentEncoded = item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0]?.textContent || description;
            if (contentEncoded) {
                const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch) {
                    imageUrl = imgMatch[1];
                }
            }
        }

        if (!imageUrl) {
            const thumbnail = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0];
            if (thumbnail) {
                imageUrl = thumbnail.getAttribute('url');
            }
        }

        if (!imageUrl) {
            const itunesImage = item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'image')[0];
            if (itunesImage) {
                imageUrl = itunesImage.getAttribute('href');
            }
        }

        const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 200);

        articles.push({
            title: title,
            description: cleanDesc + (cleanDesc.length === 200 ? '...' : ''),
            content: description.replace(/<[^>]*>/g, ''),
            url: link,
            urlToImage: imageUrl,
            source: { name: source.replace(' - NPR', '').replace(' - CNN.com', '') },
            author: '',
            publishedAt: new Date(pubDate).toISOString()
        });
    });

    return articles;
}

async function fetchWithTimeout(url, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function fetchFeed(feedUrl) {
    for (const proxy of corsProxies) {
        try {
            const proxyUrl = buildProxyUrl(proxy, feedUrl);
            const response = await fetchWithTimeout(proxyUrl, 5000);
            if (response.ok) {
                return await response.text();
            }
        } catch (e) {
            console.log('Proxy failed:', proxy, e.message);
        }
    }
    throw new Error('All proxies failed for ' + feedUrl);
}

async function refreshNews() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('newsContainer').innerHTML = '';

    try {
        const allArticles = [];
        const feedUrls = [];

        activeSources.forEach(sourceKey => {
            const source = newsSources[sourceKey];
            if (source) {
                const feeds = source.feeds[currentCategory] || source.feeds['top'];
                feeds.forEach(url => feedUrls.push(url));
            }
        });

        if (feedUrls.length === 0) {
            throw new Error('No feeds available for selected sources');
        }

        const fetchPromises = feedUrls.map(async feedUrl => {
            try {
                const xmlText = await fetchFeed(feedUrl);
                const articles = parseRSS(xmlText);
                allArticles.push(...articles);
            } catch (e) {
                console.log('Feed error:', feedUrl, e.message);
            }
        });

        await Promise.race([
            Promise.all(fetchPromises),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 12000))
        ]);

        if (allArticles.length === 0) {
            throw new Error('No articles found from US news sources');
        }

        const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
        const recentArticles = allArticles
            .filter(a => new Date(a.publishedAt).getTime() > twoDaysAgo)
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
            .slice(0, 30);

        renderNews(recentArticles);
        document.getElementById('loading').classList.add('hidden');
    } catch (err) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = err.message;
    }
}

async function renderNews(articles) {
    const container = document.getElementById('newsContainer');
    container.innerHTML = '';

    for (const article of articles) {
        const card = document.createElement('div');
        card.className = 'news-card bg-gray-900 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-800/70';
        card.onclick = () => openArticle(article);

        const date = new Date(article.publishedAt);
        const timeAgo = getTimeAgo(date);
        const fallbackImage = 'https://images.unsplash.com/photo-1504711434969-338c8ab7994d?w=400';
        const initialImage = article.urlToImage || fallbackImage;
        const needsImageFetch = !article.urlToImage;

        card.innerHTML = `
            <div class="flex flex-col md:flex-row">
                <div class="md:w-48 h-48 md:h-auto flex-shrink-0 bg-gray-800">
                    <img data-article-url="${needsImageFetch ? article.url : ''}" src="${initialImage}" alt="" class="w-full h-full object-cover article-image" onerror="this.src='${fallbackImage}'">
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <span class="bg-blue-600/30 text-blue-300 px-2 py-1 rounded">${article.source?.name || 'News'}</span>
                        <span>${timeAgo}</span>
                    </div>
                    <h3 class="font-semibold text-lg mb-2 line-clamp-2">${article.title}</h3>
                    <p class="text-gray-400 text-sm line-clamp-2 mb-3 flex-1">${article.description || 'No description available'}</p>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-500">${article.author || article.source?.name || 'Unknown'}</span>
                        <span class="text-blue-400"><i class="fa-solid fa-arrow-right mr-1"></i>Read</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        if (needsImageFetch) {
            const img = card.querySelector('.article-image');
            fetchArticleImage(article.url).then(articleImage => {
                if (articleImage && img) {
                    img.src = articleImage;
                }
            }).catch(() => {});
        }
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}

let currentArticleUrl = '';

function switchView(mode) {
    const readerView = document.getElementById('readerView');
    const originalView = document.getElementById('originalView');
    const readerBtn = document.getElementById('readerViewBtn');
    const originalBtn = document.getElementById('originalViewBtn');

    if (mode === 'reader') {
        readerView.classList.remove('hidden');
        originalView.classList.add('hidden');
        readerBtn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
        readerBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        originalBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        originalBtn.classList.add('bg-gray-800', 'hover:bg-gray-700');
    } else {
        readerView.classList.add('hidden');
        originalView.classList.remove('hidden');
        originalBtn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
        originalBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        readerBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        readerBtn.classList.add('bg-gray-800', 'hover:bg-gray-700');
    }
}

async function openArticle(article) {
    currentArticleUrl = article.url;
    document.getElementById('modalTitle').textContent = article.title;
    document.getElementById('modalSource').textContent = article.source?.name || 'News';
    document.getElementById('modalLink').href = article.url;
    document.getElementById('readerFallbackLink').href = article.url;
    document.getElementById('articleFrame').src = article.url;

    switchView('reader');
    document.getElementById('readerLoading').classList.remove('hidden');
    document.getElementById('readerContent').classList.add('hidden');
    document.getElementById('readerError').classList.add('hidden');

    document.getElementById('articleModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const content = await fetchReaderContent(article.url);
    document.getElementById('readerLoading').classList.add('hidden');

    if (content && content.text) {
        const readerImage = document.getElementById('readerImage');
        const readerText = document.getElementById('readerText');

        readerText.innerHTML = content.text.split('\n\n').map(p =>
            `<p class="mb-6 text-lg leading-relaxed text-gray-100">${escapeHtml(p)}</p>`
        ).join('');

        if (content.image) {
            readerImage.src = content.image;
            readerImage.classList.remove('hidden');
        } else {
            readerImage.classList.add('hidden');
        }

        document.getElementById('readerContent').classList.remove('hidden');
    } else {
        document.getElementById('readerError').classList.remove('hidden');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeModal() {
    document.getElementById('articleModal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('articleFrame').src = '';
    currentArticleUrl = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

document.getElementById('articleModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('articleModal')) closeModal();
});

refreshNews();
