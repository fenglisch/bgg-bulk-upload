require("chromedriver");
const { Builder, By, Key } = require("selenium-webdriver");

const https = require("https");

const xml2js = require("xml2js");

const userName = "testing_bulk_upload";

const password = "Gambe42wl";

const arIdsFromInput = [];

function getIdsAlreadyInCollection() {
  return new Promise((resolve, reject) => {
    let req = https.request(
      `https://boardgamegeek.com/xmlapi2/collection?username=${userName}&own=1&excludesubtype=boardgameexpansion&brief=1`,
      (res) => {
        console.log("Status code: " + res.statusCode);
        if (res.statusCode !== 200) throw new Error("Https request failed.");
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          xml2js.parseString(data, (err, result) => {
            if (err) {
              reject(err);
            } else {
              const arIdsAlreadyInCollection = result.items.item.map(
                (objGame) => objGame.$.objectid
              );
              resolve(arIdsAlreadyInCollection);
            }
          });
        });
      }
    );
    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  }).catch(console.log);
}

getIdsAlreadyInCollection()
  .then((response) => {
    const arIdsAlreadyInCollection = response.map((id) => +id);
    arIdsFromInput.map((id) => +id);
    const arNewIds = arIdsFromInput.filter(
      (id) => !arIdsAlreadyInCollection.includes(id)
    );
    console.log(arNewIds);
    addNewGamesToCollection(arNewIds);
  })
  .catch((err) => {
    console.error(err);
  });

async function addNewGamesToCollection(arNewIds) {
  let driver = await new Builder().forBrowser("chrome").build();
  try {
    await driver.get("https://www.boardgamegeek.com/login");
    await driver.findElement(By.id("inputUsername")).sendKeys(userName);
    await driver
      .findElement(By.id("inputPassword"))
      .sendKeys(password, Key.RETURN);
    // await driver.sleep(2000);

    let i = -1;

    const intervalId = setInterval(addGameToCollection, 7000);

    async function addGameToCollection() {
      ++i;
      if (i === arNewIds.length - 1) {
        clearInterval(intervalId);
        console.log("[Processing completed]");
      }
      driver.get(`https://boardgamegeek.com/boardgame/${arNewIds[i]}`);
      driver.sleep(2000);
      try {
        const btnAlreadyInCollection = await driver.findElement(
          By.id("button-collection")
        );
        if (!btnAlreadyInCollection) throw new Error("");
      } catch {
        driver.executeScript(
          `document.querySelector("[ng-disabled='colltoolbarctrl.loading']").click();`
        );
        driver.sleep(1500);
        driver.executeScript(
          `document.querySelector("[ng-model='item.status.own']").click();`
        );
        driver.sleep(1500);
        driver.executeScript(
          `document.querySelector("[ng-disabled='editctrl.saving']").click();`
        );
      }
    }

    await driver.sleep(1000);
  } finally {
  }
}
