require("chromedriver");
const { Builder, By, Key } = require("selenium-webdriver");

const arGameIds = [2, 14, 21];
(async function test() {
  let driver = await new Builder().forBrowser("chrome").build();
  try {
    await driver.get("https://www.boardgamegeek.com/login");
    await driver
      .findElement(By.id("inputUsername"))
      .sendKeys("constable_morty");
    await driver
      .findElement(By.id("inputPassword"))
      .sendKeys("Gambe42wl", Key.RETURN);
    await driver.sleep(2000);

    let i = -1;

    const intervalId = setInterval(addGameToCollection, 5000);

    async function addGameToCollection() {
      ++i;
      if (i === arGameIds.length - 1) clearInterval(intervalId);
      driver.get(`https://boardgamegeek.com/boardgame/${arGameIds[i]}`);
      driver.sleep(1000);
      try {
        const btnAlreadyInCollection = await driver.findElement(
          By.id("button-collection")
        );
        if (!btnAlreadyInCollection) throw new Error("");
      } catch {
        driver.executeScript(
          `document.querySelector("[ng-disabled='colltoolbarctrl.loading']").click();`
        );
        driver.sleep(500);
        driver.executeScript(
          `document.querySelector("[ng-disabled='editctrl.saving']").click();`
        );
      }
    }

    // arGameIds.forEach(async (gameId) => {
    //   await driver.get(`https://boardgamegeek.com/boardgame/${gameId}`);
    //   await console.log(gameId);
    //   await driver.sleep(2000);
    //   await driver.executeScript(
    //     `document.querySelector("[ng-disabled='colltoolbarctrl.loading']").click()`
    //   );
    //   await driver.sleep(500);
    //   await driver.executeScript(
    //     `document.querySelector("[ng-disabled='colltoolbarctrl.loading']").click()`
    //   );
    //   await console.log("Added game");
    // });

    await driver.sleep(1000);
  } finally {
  }
})();
