const fs = require("fs");
const puppeteer = require("puppeteer-core");

function getRegex(domain) {
  return new RegExp(
    `("${domain})([a-zA-Z0-9-/._]+)?(\\?)?([=a-zA-Z0-9-.&]+)?`,
    "g"
  );
}

function createDirs(path, folder, created) {
  const splitedPath = path.split("/");

  // no need to create dirs
  if (splitedPath.length === 1) {
    return;
  }

  // loop through splited path and create dirs
  let previousPath = "";
  for (let i = 0; i < splitedPath.length - 1; i++) {
    const currentDir = previousPath + splitedPath[i];

    if (created[currentDir] === undefined && currentDir.length) {
      created[currentDir] = true;
      fs.mkdir(folder + currentDir, (error) => {});
    }

    previousPath = currentDir + "/";
  }
}

function getReplacement(match, domain) {
  let replacement = "";

  //const regex = new RegExp(`("${domain})([a-z0-9-/._]+)?(\\?)?`, "g");
  const regex = getRegex(domain);
  const data = regex.exec(match);

  if (data) {
    if (data[2] == undefined) {
      data[2] = "";
    }

    if (data[2].endsWith("/")) {
      data[2] = data[2].substring(0, data[2].length - 1) + ".html";
    }

    // if (data[3] == "?") {
    //   data[3] = "%3F";
    // }

    // if (!data[3]) {
    //   data[3] = "";
    // }

    // if (!data[4]) {
    //   data[4] = "";
    // }

    replacement = `"/${data[2]}`;
  }

  // console.log(match);
  // console.log(replacement);

  return replacement;
}

async function getLinks(domain) {
  // logs here will be in the browser
  let linksObject = {};

  function getRegex(domain) {
    return new RegExp(
      `(${domain})([a-zA-Z0-9-/._]+)?(\\?)?([=a-zA-Z0-9-.&]+)?`,
      "g"
    );
  }

  function getReplacement(match, domain, nonsense) {
    let replacement = "";

    //const regex = new RegExp(`("${domain})([a-z0-9-/._]+)?(\\?)?`, "g");
    const regex = getRegex(domain);
    const data = regex.exec(match);

    // console.log("match", match, "data", data);

    if (data) {
      if (data[2] == undefined) {
        data[2] = "";
      }

      if (
        data[2].endsWith(".html") ||
        data[2].endsWith(".css") ||
        data[2].endsWith(".jpg") ||
        data[2].endsWith(".png") ||
        data[2].endsWith(".mp4")
      ) {
        cleaned = `${data[2]}`;
        return cleaned;
      }

      if (data[2].endsWith("/")) {
        data[2] = data[2].substring(0, data[2].length - 1) + ".html";
      }

      // if (data[3] == "?") {
      //   data[3] = "%3F";
      // }

      // if (!data[3]) {
      //   data[3] = "";
      // }

      // if (!data[4]) {
      //   data[4] = "";
      // }

      replacement = `${data[2]}`;
    }

    // console.log(match);
    // console.log(replacement);

    return replacement;
  }

  linksObject[domain] = {
    type: "anchor",
    path: "index.html",
  };

  let nodeList;

  // css;
  nodeList = document.querySelectorAll(`link[rel="stylesheet"]`);

  nodeList.forEach(function (node) {
    // node.href = node.href.replace("?", "%3F");

    if (linksObject[node.href]) {
      return;
    }

    // removes external links
    if (!node.href.startsWith(domain)) return false;

    linksObject[node.href] = {};

    linksObject[node.href].type = "css";

    // let path = node.href.replace(url, "");

    linksObject[node.href].path = getReplacement(node.href, domain);
  });

  // images;
  nodeList = document.querySelectorAll("img");
  nodeList = Array.from(nodeList);

  let tempNodeList = document.querySelectorAll("span[data-img-id]");

  tempNodeList.forEach((el) => {
    if (el.style.backgroundImage.length) {
      let image = el.style.backgroundImage;
      image = image.substring(5, image.length - 2);
      nodeList.push({ src: image });
    }
    // if (el.style)
  });

  tempNodeList = document.querySelectorAll(".banner");

  tempNodeList.forEach((el) => {
    if (el.style.backgroundImage.length) {
      let image = el.style.backgroundImage;
      image = image.substring(5, image.length - 2);
      nodeList.push({ src: image });
    }
    // if (span.style)
  });

  nodeList.forEach((node) => {
    if (linksObject[node.src]) {
      return;
    }

    // removes external images
    if (!node.src.startsWith(domain)) return false;

    linksObject[node.src] = {};

    linksObject[node.src].type = "image";

    // let path = node.src.replace(domain, "");

    linksObject[node.src].path = getReplacement(node.src, domain);
  });

  // anchors;
  nodeList = document.querySelectorAll("a");

  nodeList.forEach((node) => {
    if (linksObject[node.href]) {
      return;
    }
    // removes external links
    if (!node.href.startsWith(domain)) return false;

    //   removes video links
    if (node.href.endsWith(".mp4")) return false;

    linksObject[node.href] = {};

    linksObject[node.href].type = "anchor";

    linksObject[node.href].path = getReplacement(node.href, domain);
  });

  // scripts;
  nodeList = document.querySelectorAll("script");

  nodeList.forEach((node) => {
    if (linksObject[node.href]) {
      return;
    }

    // removes external scripts
    if (!node.src.startsWith(domain)) return false;

    linksObject[node.src] = {};

    linksObject[node.src].type = "script";

    linksObject[node.src].path = getReplacement(node.src, domain);
  });

  return linksObject;
}

function cleanMatches(sourcecode, matches, domain) {
  matches.forEach((match) => {
    const replacement = getReplacement(match, domain);
    // const matchRegex = new RegExp(match, "g");
    sourcecode = sourcecode.replace(match, replacement);
  });
  return sourcecode;
}

async function createFiles(links, page, domain, created, crawled) {
  console.log("start links", Object.keys(links).length);
  const folder = domain.substring(8, domain.length);
  fs.mkdir(folder, (error) => {});

  for (link in links) {
    const path = links[link].path;
    const type = links[link].type;

    // check if anchor
    if (type === "anchor") {
      if (!crawled[link]) {
        console.log("crawling ", link);
        await page.goto(link, {
          waitUntil: "load",
          timeout: 0,
        });

        const new_links = await page.evaluate(getLinks, domain);
        links = { ...links, ...new_links };
        crawled[link] = true;

        // console.log("creating files");
        // await createFiles(links, page, domain, {}, {});
        console.log(Object.keys(crawled).length, " crawled");
        console.log(Object.keys(new_links).length, "new links");
        console.log(Object.keys(links).length, "all links");
        console.log(Object.keys(created).length, "created");
      }

      // const crawled_links = await page.evaluate(getLinks, link, domain);
      //crawled[link] = true;
      // console.log("  ");
    }

    // if (crawled[link]) {
    //   continue;
    // }

    // // check if created
    // if (!created[link]) {
    const createdInFs = fs.existsSync(folder + path);

    if (createdInFs) {
      created[link] = true;
      continue;
    }

    if (!createdInFs) {
      let content = "";

      // create directory for  file
      createDirs(path, folder, {});

      if (type === "anchor") {
        console.log("crawling", link);

        content = await page.content();
        const externalRegex = getRegex(domain);
        let matches = content.match(externalRegex);

        if (matches) {
          content = cleanMatches(content, matches, domain);
        }

        const internalRegex = getRegex("/");
        const newMatches = content.match(internalRegex);

        if (newMatches) {
          content = cleanMatches(content, newMatches, "/");
          content = content.replace(
            /<a href="http(s)?:\/\/(?!www.squan.com).+<\/a>/gm,
            ""
          );
          content = content.replace(/SQUAN/g, "HASH SOLUTIONS");
          content = content.replace(/Squan/g, "Hash Solutions");
          // content = content.replace(
          //   "83 SOUTHBANK ST, NORTH SYDNEY, NSW 2060 / 0488 895 356 ",
          //   "83 SOUTHBANK ST, NORTH SYDNEY, NSW 2060 / 0488 895 356"
          // );
          content = content.replace(
            `<li id="menu-item-1617" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-1617"><a href="/legal-documents.html">Legal Documents</a></li>`,
            ""
          );
        }
      } else {
        console.log("downloading ", link);
        const response = await page.goto(link, {
          waitUntil: "load",
          timeout: 0,
        });

        if (type === "image" || type === "script" || type === "css") {
          content = await response.buffer();
          fs.writeFile(folder + path, content, (error) => {});
        }
      }
      console.log(" ");

      created[link] = true;
      fs.writeFile(folder + path, content, (error) => {});
    }
  }
  //  }

  // if (Object.keys(created).length < Object.keys(links).length) {
  //   const headless = false;
  //   const executablePath = "/usr/bin/chromium";
  //   const args = ["--ignore-certificate-errors"];
  //   const browser = await puppeteer.launch({ headless, executablePath, args });
  //   const page = await browser.newPage();
  //   await createFiles(links, page, domain, created, crawled);
  //   browser.close();
  // }
}

async function run(domain) {
  const headless = false;
  const executablePath = "/usr/bin/chromium";
  const args = ["--ignore-certificate-errors"];
  const browser = await puppeteer.launch({ headless, executablePath, args });
  const page = await browser.newPage();

  console.log("loading page");
  await page.goto(domain, { timeout: 0 });

  setTimeout(async () => {
    console.log("getting links");
    const links = await page.evaluate(getLinks, domain);

    console.log("creating files");
    await createFiles(links, page, domain, {}, {});

    browser.close();
  }, 10000);
}

run("https://www.stgeorge.com.au/");
