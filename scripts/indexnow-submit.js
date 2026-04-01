// Script för att automatiskt skicka alla URL:er från sitemap.xml till IndexNow
const https = require('https');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

const SITEMAP_PATHS = [
  path.join(__dirname, '../public/sitemap.xml'),
  path.join(__dirname, '../public/sitemap-handplockat.xml')
];
const HOST = 'www.trygghand.com';
const KEY = 'b0f5cf0eae8d41cebf198183775d668d';

function extractUrlsFromSitemap(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const locs = doc.getElementsByTagName('loc');
  const urls = [];
  for (let i = 0; i < locs.length; i++) {
    const url = locs[i].textContent.trim();
    if (url) urls.push(url);
  }
  return urls;
}

function readSitemap(path) {
  return new Promise((resolve) => {
    fs.readFile(path, 'utf8', (err, xml) => {
      if (err) {
        resolve([]); // Om filen inte finns, hoppa över
      } else {
        resolve(extractUrlsFromSitemap(xml));
      }
    });
  });
}

(async () => {
  let allUrls = [];
  for (const sitemapPath of SITEMAP_PATHS) {
    const urls = await readSitemap(sitemapPath);
    allUrls = allUrls.concat(urls);
  }
  // Ta bort dubbletter
  allUrls = [...new Set(allUrls)];

  if (!allUrls.length) {
    console.error('Inga URL:er hittades i någon sitemap');
    process.exit(1);
  }

  const data = JSON.stringify({
    host: HOST,
    key: KEY,
    urlList: allUrls
  });

  const options = {
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, res => {
    let body = '';
    res.on('data', d => {
      body += d;
    });
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Svar:', body);
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();
})();
