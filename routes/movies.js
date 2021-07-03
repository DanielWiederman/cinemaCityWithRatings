const { json } = require("body-parser");
const { lastIndexOf } = require("core-js/fn/array");
var express = require("express");
var router = express.Router();
const got = require("got");
const jsdom = require("jsdom");
const fs = require("fs");
const { JSDOM } = jsdom;
require("dotenv").config();

const JSON_PATH = "savedJsons/movies.json";
const JSON_EXIST = fs.existsSync(JSON_PATH);
const CINEMA_URL = "https://www.cinema-city.co.il/";
const OMBDI_API_KEY = process.env.OMBDI_API_KEY;

function isEnglish(value) {
  let engRegex = /^[a-zA-Z0-9$@$!%:*?&#^-_. +]+$/;
  if (engRegex.test(value)) {
    return !value.includes("Dubbed");
  }
  return false;
}

async function getMovieRating(movieName) {
  const currentYear = new Date().getFullYear;
  const response = await got(
    `https://www.omdbapi.com/?apikey=${OMBDI_API_KEY}&t=${movieName}&y=${currentYear}`
  );
  try {
    if (response.error) {
      return {};
    }
    return response.body;
  } catch {
    console.log("getMovieRating error");
  }
}

async function getCinemaCityTitles() {
  if (JSON_EXIST && checkModifiedTimePassed()) {
    console.log("fs json");
    const moviesJson = fs.readFileSync(JSON_PATH);
    return JSON.parse(moviesJson);
  }
  const movieList = [];
  const response = await got(CINEMA_URL);
  try {
    const dom = new JSDOM(response.body);
    const cinemaMovies = dom.window.document.querySelectorAll(".flip-1");
    for (let index = 0; index < cinemaMovies.length; index++) {
      const movie = cinemaMovies[index];
      const name = movie.querySelector(".sub-title").innerHTML;
      const hebTitle = movie.querySelector(".title").innerHTML;
      const movieUrl = movie.querySelector(".activ > a").href;
      const hebPlot = movie.querySelector(".flip_content").innerHTML;
      const cinemaCityId = movieUrl.slice(
        movieUrl.lastIndexOf("/") + 1,
        movieUrl.length
      );
      if (isEnglish(name)) {
        const movieDetails = await getMovieRating(name);
        movieList.push({
          hebTitle,
          hebPlot,
          cinemaCityId,
          ...JSON.parse(movieDetails),
        });
      }
    }
  } catch (err) {
    console.log(err);
  }
  saveJsonToPublicFolder(movieList);
  return movieList;
}

function saveJsonToPublicFolder(json) {
  if (JSON_EXIST) {
    fs.unlinkSync(JSON_PATH);
  }
  fs.writeFileSync(JSON_PATH, JSON.stringify(json));
}

function checkModifiedTimePassed() {
  var stats = fs.statSync(JSON_PATH);
  if (stats) {
    var mtime = new Date(stats.mtime);
    var oneday = new Date().getTime() + 1 * 24 * 60 * 60 * 1000;
    if (oneday < mtime) {
      return false;
    }
  }
  return true;
}

/* GET movies listing. */
router.get("/", function (req, res, next) {
  (async function () {
    const moviesJson = await getCinemaCityTitles();
    res.send(moviesJson);
  })();
});

module.exports = router;
