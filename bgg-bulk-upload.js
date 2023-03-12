const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const { Builder, By, Key, until } = require("selenium-webdriver");
const xml2js = require("xml2js");
const axios = require("axios");
const fs = require("fs");

const BASE_URL = "https://boardgamegeek.com";
const userName = getCredentials("-u");
const password = getCredentials("-p");
const isDebuggingMode = process.argv.includes("debugging-mode");
const isShowBrowser = process.argv.includes("show-browser");
const arAddedIds = [];
const arIdsFailedToAdd = [];

async function start() {
  const arIdsFromInput = getIdsFromFile();
  const arIdsAlreadyInCollection = await getIdsAlreadyInCollection();
  // If collection is empty, all ID's from input are new
  if (arIdsAlreadyInCollection === null) {
    if (isDebuggingMode) {
      console.log("[Debugging mode] ID's from your FILE:");
      console.log(arIdsFromInput.join(";"));
    }
    addNewGamesToCollection(arIdsFromInput);
    return;
  }
  const arNewIds = arIdsFromInput.filter(
    (id) => !arIdsAlreadyInCollection.includes(id)
  );
  console.log(
    `[Status update] ${
      arIdsFromInput.length - arNewIds.length
    } of the ID's in your file are already in your collection. ${
      arNewIds.length
    } new ID's to be added.`
  );
  if (isDebuggingMode) {
    console.log("[Debugging mode] ID's from your FILE:");
    console.log(arIdsFromInput.join(";"));
    console.log("[Debugging mode] ID's from your COLLECTION:");
    console.log(arIdsAlreadyInCollection.join(";"));
    console.log("[Debugging mode] New ID's to be added:");
    console.log(arNewIds.join(";"));
  }
  addNewGamesToCollection(arNewIds);
}

function getIdsFromFile() {
  try {
    // process.argv[2] is the path to the input file, because process.argv[0] is "node" and process.argv[1] is "bgg-bulk-upload.js"
    const dataFromFile = fs.readFileSync(process.argv[2], "utf8");
    // Converting each id to a number and then filtering out all falsy elements. This removes all non-number elements
    return dataFromFile
      .split(";")
      .map((id) => +id)
      .filter(Boolean);
  } catch (err) {
    console.log(
      "[Error] Could not read content of file. Please check the path and use this syntax:"
    );
    console.log(
      "$ node index.js PATH/TO/listOfIds.csv -u your_username -p your_password"
    );
    if (isDebuggingMode) console.log(err);
    process.exit();
  }
}

// This is required to remove ID's that are already present in the collection from the ID's to be added
async function getIdsAlreadyInCollection() {
  // See https://boardgamegeek.com/wiki/page/BGG_XML_API2#toc11 for all supported URL parameters
  const parameters = {
    username: userName,
    brief: "1",
  };
  const urlParameters = new URLSearchParams(parameters).toString();
  const jsonCollection = await makeHttpRequest(
    `${BASE_URL}/xmlapi2/collection?${urlParameters}`
  );
  // This function runs before the login attempt in addNewGamesToCollection(), therefore a wrong userName would be detected here
  if (jsonCollection.errors) {
    console.log("[Error] Access to your existing BGG collection failed.");
    console.log(jsonData.errors.error[0].message[0]);
    throw new Error();
  }
  const numberOfFoundItems = jsonCollection.items.$.totalitems;
  console.log(
    `[Success] Access to your existing BGG collection was successful. Found ${numberOfFoundItems} items.`
  );
  return numberOfFoundItems > 0
    ? jsonCollection.items.item.map((objGame) => +objGame.$.objectid)
    : null;
}

async function makeHttpRequest(url) {
  try {
    const res = await axios.get(url);
    if (res.status === 202) {
      console.log(
        "[Pending] BGG needs some time to get your collection. Automatic retry in 5 seconds."
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return await makeHttpRequest(url);
    }
    const xmlStringData = res.data;
    const parser = new xml2js.Parser();
    const jsonData = await parser.parseStringPromise(xmlStringData);
    return jsonData;
  } catch (error) {
    if (error.response && error.response.status === 502) {
      console.log(
        "[Error] The server of BoardGameGeek seems to be down. You can check that by navigating to boardgamegeek.com in your normal browser."
      );
      console.log(
        "If so, please wait for the BGG server to come back and then try again."
      );
      process.exit();
    }
    console.log(
      "[Error] Access to your existing BGG collection failed. Please check your username."
    );
    process.exit();
  }
}

// Process arguments from command line to get username and password
function getCredentials(flag) {
  try {
    const indexOfFlag = process.argv.indexOf(flag);
    if (indexOfFlag === -1) throw new Error();
    // Syntax is "$ node index.js -u your_username -p your_password", therefore the value of username/password is next item after the flag
    const credential = process.argv[indexOfFlag + 1];
    if (!credential) throw new Error();
    return credential;
  } catch (error) {
    console.log(
      "Please provide your username and password. Follow the following syntax:"
    );
    console.log(
      "$ node index.js PATH/TO/listOfIds.csv -u your_username -p your_password"
    );
    throw new Error();
  }
}

async function addNewGamesToCollection(arIdsToBeAdded) {
  let options = "";
  let driver = "";

  if (process.argv.includes("firefox")) {
    let options = new firefox.Options();
    if (!isShowBrowser) options.addArguments("-headless");
    driver = new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(options)
      .build();
  } else {
    options = new chrome.Options();
    if (!isShowBrowser) options.addArguments("--headless");
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();
  }

  try {
    await driver.get(`${BASE_URL}/login`);
    console.log("[Status update] Logging in.");
    await driver.sleep(3000);
    await driver.findElement(By.id("inputUsername")).sendKeys(userName);
    await driver
      .findElement(By.id("inputPassword"))
      .sendKeys(password, Key.RETURN);
    // Give the front page some time to load before checking if login was successful
    await driver.sleep(5000);
    const pageTitle = await driver.getTitle();
    if (pageTitle !== "BoardGameGeek | Gaming Unplugged Since 2000")
      throw "[Error] Login failed. Please check username and password";
    console.log("[Success] Login succeeded.");

    // Using a "for... of" loop in order to wait for each iteration to finish before starting the next one, unlike forEach loops
    for (const id of arIdsToBeAdded) {
      try {
        await driver.get(`${BASE_URL}/boardgame/${id}`);
        await driver.wait(
          until.elementIsEnabled(
            driver.findElement(
              By.xpath("//button[@ng-disabled='colltoolbarctrl.loading']")
            )
          ),
          10000
        );
        // The normal method driver.findElement().click() does not work for the "Add to collection button", it throws the error:
        // "ElementNotInteractableError: Element <button class="btn btn-sm btn-primary toolbar-action-full"> could not be scrolled into view"
        await driver.executeScript(
          `document.querySelector("[ng-disabled='colltoolbarctrl.loading']").click();`
        );
        await driver.executeScript(
          `document.querySelector("[ng-model='item.status.own']").click();`
        );
        await driver.executeScript(
          `document.querySelector("[ng-disabled='editctrl.saving']").click();`
        );
        arAddedIds.push(id);
        const pageTitle = await driver.getTitle();
        const gameTitle = pageTitle.replace(/(.*?) \|.*/, "$1");
        console.log(
          `[Status update] Successfully added "${gameTitle}" (ID ${id}) to your collection.`
        );
        const i = arIdsToBeAdded.indexOf(id) + 1;
        if (i % 10 === 0)
          console.log(
            `[Status update] Processed ${i} of ${arIdsToBeAdded.length} items.`
          );
      } catch (err) {
        try {
          // Check if browser is still running
          await driver.getTitle();
          arIdsFailedToAdd.push(id);
          console.log(
            `[Status update] Could not add ID ${id} to your collection. Attempting next item.`
          );
          if (isDebuggingMode) console.log(err);
        } catch (err) {
          console.log("[Error] Browser session closed. Process aborted");
          if (isDebuggingMode) console.log(err);
          break;
        }
      }
    }
    console.log("[Finished]");
    if (arAddedIds.length > 0) {
      console.log(
        `[Final report] Successfully added ${arAddedIds.length} games.`
      );
      if (isDebuggingMode) console.log(arAddedIds.join(";"));
    }
    if (arIdsFailedToAdd.length > 0) {
      console.log(
        "[Final report] Adding the games with the following ID's failed. Please try again or add them manually."
      );
      console.log(arIdsFailedToAdd.join(";"));
    }
  } catch (err) {
    console.log(err);
  } finally {
    if (!isDebuggingMode && isShowBrowser) await driver.quit();
  }
}

start();
