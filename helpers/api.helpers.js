const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('../config');

const ESERVICEHK_API = 'https://img.eservice-hk.net';
const GOOGLE_API = 'https://maps.googleapis.com/maps/api';
const TRIPLE_API = 'http://localhost:8000';
const WIKI_API = 'https://en.wikipedia.org/api/rest_v1';


function fetchProperty() {
    return fetchFromAPI({
        root: TRIPLE_API,
        endpoint: 'system/property',
    });
}

function fetchSummary(title) {
    return fetchFromAPI({
        root: WIKI_API,
        endpoint: `page/summary/${title}`,
    });
}

function fetchCity(id) {
    return fetchFromAPI({
        root: GOOGLE_API,
        endpoint: 'place/details/json',
        params: {
            language: 'en_US',
            key: config.google_place_key,
            placeid: id,
        }
    });
}

function fetchPrediction(code, name) {
    return fetchFromAPI({
        root: GOOGLE_API,
        endpoint: 'place/autocomplete/json',
        params: {
            input: name,
            language: 'en_US',
            key: config.google_place_key,
            components: `country:${code}`,
            types: '(cities)'
        }
    });
}

function fetchGooglePhoto(reference) {
    return fetchForPhoto({
        root: GOOGLE_API,
        endpoint: 'place/photo',
        params: {
            key: config.google_place_key,
            photoreference: reference,
            maxwidth: 720
        }
    });
}

function fetchTimezone(location) {
    return fetchFromAPI({
        root: GOOGLE_API,
        endpoint: 'timezone/json',
        params: {
            key: config.google_map_key,
            location: location,
            timestamp: 1331766000
        }
    });
}

function sendPhoto(file) {
    const form = new FormData();
    form.append('file', file, 'city.png');
    return postToPhoto({
        root: ESERVICEHK_API,
        endpoint: 'api.php?version=2',
        body: form
    });
}

function sendNewCity({ country, city, meta }) {
    return postToApi({
        root: TRIPLE_API,
        endpoint: 'city',
        body: {
            country: country,
            city: city,
            timezone: meta.timezone,
            latitude: meta.latitude,
            longitude: meta.longitude,
            photo: meta.photo,
            description: meta.description,
        },
        headers: {
            Authorization: `Bearer ${config.api_key}`
        }
    });
}

function postToApi({root, endpoint, body, headers = {}}) {
    let url = [root, endpoint].join('/');
    if (body) {
        body = Object.entries(body).map(param => param.join('=')).join('&');
    }
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers,
        },
        body
    });
}

function postToPhoto({ root, endpoint, body, headers = {} }) {
    let url = [root, endpoint].join('/');

    return fetch(url, {
        method: 'POST',
        headers,
        body
    });
}

function fetchForPhoto({ root, endpoint, params, headers }) {
    let url = [root, endpoint].join('/');
    if (params) {
        const paramString = Object.entries(params).map(param => param.join('=')).join('&');
        url += `?${paramString}`;
    }

    return fetch(url, { headers })
        .then(response => response.buffer());
}

function fetchFromAPI({root, endpoint, params, headers}) {
    let url = [root, endpoint].join('/');
    if (params) {
        const paramString = Object.entries(params).map(param => param.join('=')).join('&');
        url += `?${paramString}`;
    }

    return fetch(url, { headers })
        .then(response => response.json());
}

module.exports = {
    fetchCity,
    fetchGooglePhoto,
    fetchPrediction,
    fetchProperty,
    fetchSummary,
    fetchTimezone,
    sendPhoto,
    sendNewCity
};