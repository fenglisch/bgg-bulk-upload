# Bulk upload your boardgames to your BoardGameGeek Collection

This programs allows you to bulk upload a list of boardgames to your BGG collection, a feature currently missing on BGG.

You need to provide the BGG ID of each game. [This website]() helps you to identify the ID's of your boardgames, given a list of their names.

## How to setup

'''Prerequisites''': You need to have `node` and `npm` installed (see [instructions](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)). You also need Google Chrome or Firefox. Google Chrome is set as the default browser. If you want to use Firefox, you must explicitly specify that when exectuting the program (see "Additional options").

1. Download this repository and save it as a directory on your local computer.
2. Navigate to the directory.
3. Open the the terminal/command line in the directory.
4. Run the following command:
   `$ npm install`

## How to run

The program is executed from your terminal. Your command must follow the following syntax:
`$ node bgg-bulk-upload.js PATH/TO/my_collection.csv -u your_username -p your_password`

So, for example:
`$ node bgg-bulk-upload.js Desktop/Boardgames/list_of_ids.csv -u gamingFreak3000 -p 12345678`

### Additional options

- `firefox` - The default browser is Google Chrome. If you want to use Firefox instead, just add `firefox` at the end of your command.
- `show-browser` - By default, the program uses a headless browser, which runs invisibly in the background and therefore has a better perfomance. If you want to watch the browser navigate to all the pages and click the buttons, add `show-browser` at the end of your command. This is recommended for debugging in particular.
- `debugging-mode` - By default, the programm logs the number of ID's it found in your already existing BGG collection and in the file you uploaded, as well as the resulting number of new ID's to be added. When `debugging-mode` is activated, the program will not only log each number, but the full list of ID's. Also, when `show-browser` is also set, the browser will not automatically close at the end after it finished processing.

Our previous example would look as follows, when all additional options are activated:
`$ node bgg-bulk-upload.js Desktop/Boardgames/list_of_ids.csv -u gamingFreak3000 -p 12345678 firefox show-browser debugging-mode`
(The order of the additional options does not matter.)

## Formatting requirements of the input file

The file must include a semicolon-separated list of the ID's to be added. It does not matter, whether the ID's are wrapped in quotation marks or not. All non-numerical content is ignored. There is no restriction regarding the file extension, but CSV and TXT probably makes most sense.

## How it works

The program reads the ID's from the input file. It then compares them to the ID's which are already in the user's collection. To do that, it sends a http request to XML API2 of BoardGameGeek. After this comparision, the program knows which of the ID's of the input file are actually new ID's to be added to the collection.

It then starts a browser session (Chrome or Firefox, as you wish) with Selenium webdriver. After logging in, it navigates to the pages of all the games specified by the ID's. Here, it clicks the buttons to add each game to the user's collection. This continues until all ID's are processed (or until something occured that lead to an abortion).
