#!/usr/bin/env node

/**
 * @fileoverview Main CLI that creating a new city for triple.
 * @author PokeGuys
 */

'use strict';

const countries = require('country-list')();
const fs = require('fs');
const inquirer = require('inquirer');
const urlRegex = require('url-regex');
const { 
    fetchCity,
    fetchGooglePhoto,
    fetchPrediction,
    fetchProperty,
    fetchSummary,
    fetchTimezone,
    sendPhoto,
    sendNewCity
} = require('./helpers/api.helpers');

async function setupCity(city) {
    return await inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'country',
            message: 'Which country you want to add?',
            source: function (answersSoFar, input) {
                input = input || '';
                return new Promise(function (resolve) {
                    resolve(countries.getData().filter(item => item.name.toLowerCase().includes(input.toLowerCase())));
                });
            }
        },
        {
            type: 'input',
            name: 'name',
            message: 'Which city you want to add?',
            validate: value => {
                let pass = value.match(
                    /^([^\d]+)$/i
                );
                if (pass) {
                    return true;
                }

                return 'Please enter a valid city';
            }
        }
    ]).then(async answer => {
        if (city.some(item => answer.name === item.name.toLowerCase())) {
            console.log('City Existed!');
            return await setupCity(city);
        } else {
            let meta = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'isDescriptionAuto',
                    message: 'Do you want to extract description automatically?',
                    default: true
                },
                {
                    type: 'editor',
                    name: 'description',
                    message: 'Please enter the city description.',
                    when: answers => {
                        return !answers.isDescriptionAuto;
                    }
                },
                {
                    type: 'confirm',
                    name: 'isPhotoAuto',
                    message: 'Do you want to input the city photo automatically?',
                    default: true
                },
                {
                    type: 'input',
                    name: 'photo',
                    message: 'Please enter the url of city photo.',
                    when: answers => {
                        return !answers.isPhotoAuto;
                    },
                    validate: value => {
                        if (urlRegex().text(value)) {
                            return true;
                        }

                        return 'Please enter a valid url';
                    }
                },
            ]).then(meta => meta);
            return {...answer, ...meta};
        }
    });
}

async function init() {
    let property = await fetchProperty();
    return await setupCity(property.city);
}

async function main() {
    // Fetch Wiki by using user input
    // Get city lat, lng
    // Get extract (Description)
    // Get feature photos from (Lonely Planet)
    // Guess Timezone.
    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
    let city = await init();
    const countryCode = countries.getCode(city.country);
    let result = await fetchPrediction(countryCode, city.name);
    let predictions = result.predictions;
    if (predictions.length > 0) {
        let correct = false;
        let placeId = 0;
        for (let predict of predictions) {
            if (correct) break;
            await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'correct',
                    message: `${predict.description}. Is it the city you want to add?`,
                    default: true
                },
            ]).then(answer => {
                correct = answer.correct;
                placeId = predict.place_id;
            });
        }
        let info = await fetchCity(placeId);
        let location = [info.result.geometry.location.lat, info.result.geometry.location.lng];
        let timezone = await fetchTimezone(location.join());
        let photo = await fetchGooglePhoto(info.result.photos[0].photo_reference);
        let description = await fetchSummary(info.result.name);
        let result = await sendPhoto(photo).then(response => response.json());
        if (result.status_code !== '200') {
            console.log(result);
            fs.writeFile('test.txt', photo, 'binary', function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("The file was saved!");
                }
            });

            throw new Error('E-serviceHK throw an exception!');
        }
        let apiResult = await sendNewCity({
            country: city.country,
            city: info.result.name,
            meta: {
                timezone: timezone.timeZoneId,
                latitude: location[0],
                longitude: location[1],
                photo: city.photo || result.url,
                description: city.description || description.extract,
            },
        });
        console.log('City added!');
    } else {
        throw new Error('City not found');
    }
}

main();