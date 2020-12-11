const fs = require("fs");
const puppeteer = require("puppeteer-core");

function getFilenameFromUrl(url, domain) {
  const path = url.replace(domain, "");
  const splittedUrl = path.split("/");

  if (splittedUrl.length == 1) {
    return "index.html";
  }

  return splittedUrl[splittedUrl.length - 1];
}

function getFilepathFromUrl(url, domain) {
  let path = url.replace(domain, "");

  const splitedPath = path.split("/");

  if (splitedPath.length === 1) {
    return path;
  }

  let fullPath = "";

  for (let i = 0; i < splitedPath.length - 1; i++) {
    fullPath = fullPath + splitedPath[i] + "/";
  }

  return fullPath;
}

async function getContentFromUrl(url) {
  const headless = false;
  const executablePath = "/usr/bin/chromium";
  const args = ["--ignore-certificate-errors"];
  const browser = await puppeteer.launch({ headless, executablePath, args });
  const page = await browser.newPage();
  await page.goto(url, { timeout: 0 });
  const content = await page.content();
  browser.close();
  return content;
}

async function getContentAndNewUrlsFromUrl(url) {
  const headless = false;
  const executablePath = "/usr/bin/chromium";
  const args = ["--ignore-certificate-errors"];
  const browser = await puppeteer.launch({ headless, executablePath, args });
  const page = await browser.newPage();
  await page.goto(url, { timeout: 0 });
  const content = await page.content();

  const new_urls = await page.evaluate(() => {
    // runs in browser
    let data = [];
    let nodeList = document.querySelectorAll(`link[rel="stylesheet"]`);

    nodeList.forEach(function (node) {
      data.push(node.href);
    });

    nodeList = document.querySelectorAll("script");

    nodeList.forEach((node) => {
      if (node.src != "") {
        data.push(node.src);
      }
    });

    return data;
  });

  browser.close();
  return { content, new_urls };
}

function createFoldersFromPath(path) {
  if (path == "") {
    return;
  }

  const splitedPath = path.split("/");

  // no need to create dirs
  if (splitedPath.length === 1) {
    return;
  }

  // loop through splited path and create dirs
  let previousPath = "";
  for (let i = 0; i < splitedPath.length - 1; i++) {
    const currentDir = previousPath + splitedPath[i];

    fs.mkdir(currentDir, (error) => {});

    previousPath = currentDir + "/";
  }
}

async function runApp(urls, domain, folder) {
  console.log("urls ", urls);

  if (urls.length == 0) {
    return;
  }

  let data = [];
  for (let i = 0; i < urls.length; i++) {
    console.log("processing", urls[i]);
    const filename = getFilenameFromUrl(urls[i], domain);
    const filepath = getFilepathFromUrl(urls[i], domain);

    if (urls[i].endsWith(".css") || urls[i].endsWith(".js")) {
      const content = await getContentFromUrl(urls[i]);
      createFoldersFromPath(folder + filepath);
      fs.writeFile(folder + filepath + filename, content, (errors) => {});
    } else {
      const { content, new_urls } = await getContentAndNewUrlsFromUrl(urls[i]);
      data = new_urls;
      createFoldersFromPath(folder + filepath);
      fs.writeFile(folder + filepath + filename, content, (errors) => {});
    }
  }

  runApp(data, domain, folder);
}

const folder = "www.stgeorge.com.au/";
const domain = "https://www.stgeorge.com.au/";
const urls = ["https://www.stgeorge.com.au/"];

runApp(urls, domain, folder);
