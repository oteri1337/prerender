const fs = require("fs");
const puppeteer = require("puppeteer-core");

// create folders from path
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

// save page content
// --- given a link and content
// --- saves content to html file
function saveHtml(link, content) {
  file = link.replace("https://", "");

  createFoldersFromPath(link);

  file = file + ".html";

  fs.writeFile(file, content, (error) => {
    console.log(error);
  });
}

// save page content
// --- given a link and content
// --- saves content to html file
function saveImage(link, content) {
  file = link.replace("https://", "");

  createFoldersFromPath(link);

  fs.writeFile(file, content, (error) => {
    console.log(error);
  });
}

// save index page
// --- given a link and content
// --- saves content to en.html file
function saveIndex(content) {
  fs.writeFile("www.stgeorge.com.au/en.html", content, (error) => {
    console.log(error);
  });
}

// match Links and Replace
function matchLinksAndReplace(content) {
  const linksRegex = /(<a href="\/[a-z-=/]+)(">[A-Za-z/&; ]+<\/a>)/g;
  // const linksRegex = /(<a href="https:\/\/[a-z./-]+\?[=a-z]+)(">[A-Za-z/&; ]+<\/a>)/g;
  return content.replace(linksRegex, "$1.html$2");
}

// init page
async function initPage() {
  const headless = true;
  const executablePath = "/usr/bin/chromium";
  const args = ["--ignore-certificate-errors"];
  const browser = await puppeteer.launch({ headless, executablePath, args });
  const page = await browser.newPage();
  return page;
}

// get internal anchor links
// --- given a link and domain
// --- return anchor links object
async function pageGetInternalAnchorLinks(link, domain) {
  // load page
  const page = await initPage();

  await page.goto(link, { timeout: 0 });

  // dom function
  const domFunction = (d) => {
    const linksObject = {};

    const nodeList = document.querySelectorAll("a");

    nodeList.forEach((node) => {
      if (node.href.startsWith(d)) {
        linksObject[node.href] = "false";
      }
    });

    console.log(linksObject);

    return linksObject;
  };

  // get anchor links
  const links = await page.evaluate(domFunction, domain);

  return links;
}

// get internal image links
// --- given a link and domain
// --- return array of image links
async function pageGetInternalImageLinks(link, domain) {
  // load page
  const page = await initPage();

  await page.goto(link, { timeout: 0 });

  // dom function
  const domFunction = (d) => {
    const links = [];

    let nodeList = document.querySelectorAll("img");

    nodeList.forEach((node) => {
      if (node.src.startsWith(d)) {
        links.push(node.src);
      }
    });

    nodeList = document.querySelectorAll(".page-header-wrapper");

    nodeList.forEach((node) => {
      let image = node.style.backgroundImage;
      image = d + image.substring(6, image.length - 2);
      links.push(image);
    });

    return links;
  };

  // get anchor links
  const links = await page.evaluate(domFunction, domain);

  return links;
}

// get page content
// --- given a link
// --- return page content
async function pageGetContent(link) {
  // load page
  const page = await initPage();

  await page.goto(link, { timeout: 0 });

  // get content
  const content = await page.content();

  return content;
}

// get image
// --- given a link
// --- get image
async function pageGetImage(link) {
  // load page
  const page = await initPage();

  const response = await page.goto(link, { timeout: 0 });

  // get content
  const content = await response.buffer();

  return content;
}

async function appDownloadPage(link) {
  let content = await pageGetContent(link);

  content = content.replace(/https:\/\/www.stgeorge.com.au/g, "");

  content = matchLinksAndReplace(content);

  saveHtml(link, content);
}

async function appDownloadImages(link) {
  const domain = "https://www.stgeorge.com.au/";

  const links = await pageGetInternalImageLinks(link, domain);

  console.log(links);

  links.forEach(async (link) => {
    console.log("downloading ", link);
    let content = await pageGetImage(link);
    saveImage(link, content);
  });
}

appDownloadImages("https://www.stgeorge.com.au/business/kickstart");

// appDownloadPage("https://www.stgeorge.com.au/corporate-business/economic-reports");

// async function appOne() {
//   const page = await initPage();
//   const domain = "https://www.stgeorge.com.au";
//   const links = await pageGetAnchorLinks(page, domain, domain);
//   saveLinksObject(links);
// }

// async function appTwo() {
//   const page = await initPage();
//   const link = "https://www.stgeorge.com.au/";

//   let content = await pageGetContent(page, link);

//   content = content.replace(/https:\/\/www.stgeorge.com.au/g, "");

//   content = matchLinksAndReplace(content);

//   saveIndexContent(content);
// }

// save anchor links to db json
// function saveLinksObject(linksObject) {
//   const content = JSON.stringify(linksObject);
//   fs.writeFile("db.json", content, (error) => {});
// }
