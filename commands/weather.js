const path = require('path');
const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonStyle, ButtonBuilder, ActionRowBuilder, Colors } = require('discord.js');
const weatherTable = require('../dbactions/weatherTable');
const { fetchWeatherApi } = require('openmeteo');
const https = require('https');
const url = require('url');
const math = require('mathjs');

const WMO_CODES = { // ☁️⛅⛈️🌤️🌥️🌦️🌧️🌨️🌩️🌫️🌝🌞☔☃️ 
  0: '🌞 Clear Sky',
  1: '⛅ Mostlyy Clear',
  2: '⛅ Partly Cloudy',
  3: '☁️ Overcast',
  45: '🌫️ Fog',
  48: '🌫️ Fog',
  51: '🌦️ Light Drizzle',
  53: '🌦️ Moderate Drizzle',
  55: '🌦️ Dense Drizzle',
  56: '🌨️ Light Freezing Drizzle',
  57: '🌨️ Freezing Drizzle',
  61: '🌧️ Light Rain',
  63: '🌧️ Rain',
  65: '🌧️ Heavy Rain',
  66: '🌨️ Light Freezing Rain',
  67: '🌨️ Freezing Rain',
  71: '🌨️ Light Snow',
  73: '🌨️ Snow',
  75: '🌨️ Heavy Snow',
  77: '🌨️ Snow',
  80: '🌧️ Light Rain Showers',
  81: '🌧️ Rain Showers',
  82: '🌧️ Heavy Rain Showers',
  85: '🌨️ Snow Showers',
  86: '🌨️ Heavy Snow Showers',
  95: '⛈️ Thunderstoms',
  96: '⛈️ Thunderstorms',
  99: '⛈️ Strong Thunderstorms'
};

const COMMAND_NAME = path.basename(__filename, '.js');
const OPTIONS = {
  LOCATION: 'location',
  REMEMBER: 'remember'
};
const BUTTON_IDS = {
  CURRENT: 'weatherCurrent',
  TODAY: 'weatherToday',
  HOURLY: 'weatherHourly',
  FORECAST: 'weatherForecast',
  ALERTS: 'weatherAlerts',
  LOCATION: 'weatherLocation',
};

const currentButton = new ButtonBuilder({
  label: 'Current',
  customId: BUTTON_IDS.CURRENT,
  style: ButtonStyle.Primary,
  disabled: false,
});
const todayButton = new ButtonBuilder({
  label: 'Today',
  customId: BUTTON_IDS.TODAY,
  style: ButtonStyle.Secondary,
  disabled: false,
});
const hourlyButton = new ButtonBuilder({
  label: 'Hourly',
  customId: BUTTON_IDS.HOURLY,
  style: ButtonStyle.Secondary,
  disabled: false,
});
const alertsButton = new ButtonBuilder({
  label: 'Alerts',
  customId: BUTTON_IDS.ALERTS,
  style: ButtonStyle.Danger,
  disabled: true,
});
const forecastButton = new ButtonBuilder({
  label: 'Forecast',
  customId: BUTTON_IDS.FORECAST,
  style: ButtonStyle.Secondary,
  disabled: false,
});

const degreesToCompass = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};
const degreesToArrow = (degrees) => {
  const arrows = ['⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️','↖️'];
  const index = Math.round(degrees / 45) % 8;
  return arrows[index];
};

const roundToN = (number, decimalPlaces = 2) => {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round((number + Number.EPSILON) * multiplier) / multiplier;
};

const formatWeather = (data) => {
  const {
    weatherCode = WMO_CODES[0], // WMO
    temperature2mMax = 0, // C
    temperature2mMin = 0, // C
    precipitationProbability = 0, // %
    temperature2m = 0, // Celcius
    relativeHumidity2m = 0, // %
    windSpeed10m = 0, // km/h
    windDirection10m = 0, // degrees
    rain = 0, // mm
    snow = 0, // cm
  } = data;

  const temperature2mToF = math.unit(temperature2m, 'degC').to('degF').toNumber(); // F
  const temperature2mMaxToF = math.unit(temperature2mMax, 'degC').to('degF').toNumber(); // F
  const temperature2mMinToF = math.unit(temperature2mMin, 'degC').to('degF').toNumber(); // F
  const windToMPH = math.unit(roundToN(windSpeed10m, 0), 'km/h').to('mi/h').toNumber(); // mph
  const rainToInch = math.unit(roundToN(rain, 2), 'mm').to('inch').toNumber(); // in
  const snowToInch = math.unit(roundToN(snow, 2), 'cm').to('inch').toNumber(); //in

  const WEATHER_CODE = `__*${weatherCode}*__`;
  const CURRENT_TEMP = `🌡${roundToN(temperature2mToF, 0)}°F(${roundToN(temperature2m, 0)}°C)`;
  const HIGH_TEMP = `🌡Hi:${roundToN(temperature2mMaxToF, 0)}°F (${roundToN(temperature2mMax, 0)}°C)`;
  const LOW_TEMP = `🌡Lo:${roundToN(temperature2mMinToF, 0)}°F (${roundToN(temperature2mMin, 0)}°C)`;
  const HUMIDITY = `💧Humidity:${roundToN(relativeHumidity2m, 0)}%`;
  const WIND_SPEED = `🌬${roundToN(windToMPH, 0)} mph`;
  const WIND_DIRECTION = `${degreesToCompass(windDirection10m)}${degreesToArrow(windDirection10m)}`;
  const PRECIP_CHANCE = `🌂Chance of precip: ${Math.round(precipitationProbability)}%`;
  const RAINFALL = `${Math.round(rain) ? `🌧️Rain: ${roundToN(rainToInch)}in (${roundToN(rain)} mm)` : ''}`;
  const SNOWFALL = `${Math.round(snow) ? `🌨Snow: ${roundToN(snowToInch)}in (${roundToN(snow)} cm)` : ''}`;
  
  return WEATHER_CODE
   + `\n${temperature2m ? CURRENT_TEMP : `${HIGH_TEMP}\n${LOW_TEMP}`}`
   + `${relativeHumidity2m ? `\n${HUMIDITY}` : ''}`
   + `\n${WIND_SPEED} ${windDirection10m ? WIND_DIRECTION : ''}`
   + `${precipitationProbability ? `\n${PRECIP_CHANCE}` : ''}`
   + `${rain ? `\n${RAINFALL}` : ''}`
   + `${snow ? `\n${SNOWFALL}` : ''}`
  ;
};

const getAlerts = async (latitude, longitude) => {
  // https://api.weather.gov/alerts?point=43.06%2C-75.27&limit=2
  const requestUrl = new url.URL('https://api.weather.gov/alerts/active');
  requestUrl.searchParams.set('point',`${latitude},${longitude}`);
  requestUrl.searchParams.set('limit', 3);

  return new Promise((resolve, reject) => {
    https.get({
      hostname: requestUrl.hostname,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'user-agent': 'nodejs-goose'
      }
    }, (response) => {
      let raw = '';
      if (response.statusCode !== 200) {
        reject(response.statusCode + response.statusMessage);
      }
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try {
          const finishedResponse = JSON.parse(raw);
          resolve(finishedResponse);
        } catch (e) {
          reject(e);
        }
      });
    });
  });
};

const getLocation = async (locationName) => {
  // https://api.mapbox.com/geocoding/v5/mapbox.places/1058KJ.json?types=place%2Cpostcode%2Caddress&access_token=pk.eyJ1IjoibGljaGlnMCIsImEiOiJja3o4ZGZyNzAxam0wMnZvZmttdWdrZmpqIn0.TAgbeSANbbkKvXHLJkg4aw
  console.log(`finding ${locationName}`);
  const requestUrl = url.parse(url.format({
    protocol: 'https',
    hostname: 'api.mapbox.com',
    pathname: `/geocoding/v5/mapbox.places/${locationName}.json`,
    query: {
      types: ['place','postcode'],
      proximity: '-90,40',
      access_token: process.env.MAPBOX_TOKEN,
    }
  }));
  return new Promise((resolve, reject) => {
    https.get({
      hostname: requestUrl.hostname,
      path: requestUrl.path
    }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const finishedResponse = JSON.parse(rawData);
          if (finishedResponse.features === undefined) reject(rawData);
          const resolvedLocations = finishedResponse.features.map(location => {
            return {
              name: location.place_name,
              lat: location.geometry.coordinates[1],
              lon: location.geometry.coordinates[0],
            };
          });
          console.log(resolvedLocations);
          resolve(resolvedLocations);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      console.log(err);
      reject(err);
    });
  });
};

const getOpenMeteo = async (latitude, longitude) => {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const params = {
    latitude,
    longitude,
    forecast_days: 4,
    timezone: 'auto',
    daily: [
      'weather_code', // See WMO_CODES
      'temperature_2m_max', // C
      'temperature_2m_min', // C
      'precipitation_sum', // mm
      'precipitation_probability_max', // %
      'wind_speed_10m_max', // km/h
      'rain_sum', // mm
      'snowfall_sum', //cm
    ],
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'rain',
      'snowfall',
      'weather_code',
      'wind_speed_10m'
    ],  
    current: [
      'temperature_2m', // C
      'relative_humidity_2m', // %
      'is_day', // bool
      'precipitation', // mm
      'weather_code', // See WMO_CODES
      'wind_speed_10m', // km/h
      'wind_direction_10m', // degrees
      'rain', // mm
      'snowfall', //cm
    ]
  };

  const responses = await fetchWeatherApi(url, params);
  const response = responses[0];

  // Attributes for timezone and location
  const utcOffsetSeconds = response.utcOffsetSeconds();
  const timezone = response.timezone();
  const current = response.current();
  const hourly = response.hourly();
  const daily = response.daily();
  const time = new Date((Number(current.time()) + utcOffsetSeconds) * 1000);

  // Helper function to form time ranges
  const range = (start, stop, step) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

  // Note: The order of weather variables in the URL query and the indices below need to match!
  const weatherData = {
    time,
    localeTime: new Date(time.getTime() + time.getTimezoneOffset() * 60000),
    timezone,
    current: {
      time,
      timezone,
      localeTime: new Date(time.getTime() + time.getTimezoneOffset() * 60000),
      temperature2m: current.variables(0).value(),
      relativeHumidity2m: current.variables(1).value(),
      isDay: current.variables(2).value(),
      precipitation: current.variables(3).value(),
      weatherCode: WMO_CODES[current.variables(4).value()],
      windSpeed10m: current.variables(5).value(),
      windDirection10m: current.variables(6).value(),
      rain: current.variables(7).value(),
      snow: current.variables(8).value(),
    },
    hourly: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map((t, i) => {
      const time = new Date((t + utcOffsetSeconds) * 1000);
      return {
        time,
        localeTime: new Date(time.getTime() + time.getTimezoneOffset() * 60000),
        timezone,
        temperature2m: hourly.variables(0).valuesArray()[i],
        relativeHumidity2m: hourly.variables(1).valuesArray()[i],
        precipitationProbability: hourly.variables(2).valuesArray()[i],
        rain: hourly.variables(3).valuesArray()[i],
        snow: hourly.variables(4).valuesArray()[i],
        weatherCode: WMO_CODES[Number(hourly.variables(5).valuesArray()[i])],
        windSpeed10m: hourly.variables(6).valuesArray()[i],
      };
    }),
    daily: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map((t, i) => {
      const time = new Date((t + utcOffsetSeconds) * 1000);
      return {
        time,
        localeTime: new Date(time.getTime() + time.getTimezoneOffset() * 60000),
        timezone,
        weatherCode: WMO_CODES[Number(daily.variables(0).valuesArray()[i])],
        temperature2mMax: daily.variables(1).valuesArray()[i],
        temperature2mMin: daily.variables(2).valuesArray()[i],
        precipitationSum: daily.variables(3).valuesArray()[i],
        precipitationProbability: daily.variables(4).valuesArray()[i],
        windSpeed10m: daily.variables(5).valuesArray()[i],
        rain: daily.variables(6).valuesArray()[i],
        snow: daily.variables(7).valuesArray()[i],
      };
    }),
  };

  return weatherData;
};

const saveLocation = async (memberId, locationName, lon, lat) => {
  return new Promise((resolve, reject) => {
    weatherTable.add(memberId, locationName, lon, lat, [], async (e) => {
      if(e){
        return reject(e);
      }
      const DbLocation = await weatherTable.asyncGet(memberId).catch(console.error);
      if (DbLocation.name == locationName) {
        resolve(locationName);
      } else {
        reject(`Failed to save: ${locationName} does not match ${DbLocation}`);
      }
    });
  });
};

const reportWeather = async (interaction, codedLocation) => {
  const components = [];
  const row = new ActionRowBuilder();
  const { id, member } = interaction;
  console.log(codedLocation);
  getOpenMeteo(codedLocation.lat, codedLocation.lon).then(meteoData => {
    const { name } = codedLocation;
    const forecastEmbed = new EmbedBuilder();
    const currentEmbed = new EmbedBuilder();
    const todayEmbed = new EmbedBuilder();
    const hourlyEmbed = new EmbedBuilder();
    const alertsEmbed = new EmbedBuilder();
    let ACTIVE_EMBED = currentEmbed;

    row.addComponents(currentButton.setCustomId(`${BUTTON_IDS.CURRENT}_${id}`))
      .addComponents(todayButton.setCustomId(`${BUTTON_IDS.TODAY}_${id}`))
      .addComponents(hourlyButton.setCustomId(`${BUTTON_IDS.HOURLY}_${id}`))
      .addComponents(forecastButton.setCustomId(`${BUTTON_IDS.FORECAST}_${id}`))
      .addComponents(alertsButton.setCustomId(`${BUTTON_IDS.ALERTS}_${id}`));
    components.push(row);

    currentEmbed.setTitle('Current Conditions')
      .setColor(Colors.Blurple)
      .setDescription(`-# ${name} (${meteoData.timezone})`)
      .addFields([
        {name: meteoData.current.localeTime.toLocaleTimeString(), value: formatWeather(meteoData.current), inline: true}
      ])
      .setFooter({text: 'Weather data by Open-Meteo.com (https://open-meteo.com/)'});

    todayEmbed.setTitle('Today')
      .setColor(Colors.Blue)
      .setDescription(`-# ${name} (${meteoData.timezone})`)
      .addFields([
        {name: meteoData.current.localeTime.toLocaleTimeString(), value: formatWeather(meteoData.current), inline: true},
        {name: meteoData.daily[0].localeTime.toDateString(), value: formatWeather(meteoData.daily[0]), inline: true}
      ])
      .setFooter({text: 'Weather data by Open-Meteo.com (https://open-meteo.com/)'});

    hourlyEmbed.setTitle('Hourly')
      .setDescription(`-# ${name} (${meteoData.timezone})`)
      .setColor(Colors.Green)
      .addFields(meteoData.hourly.map( hour => {
        return {name: hour.localeTime.toLocaleTimeString(), value: formatWeather(hour), inline: true };
      }).slice(meteoData.localeTime.getHours()+1, meteoData.localeTime.getHours()+4))
      .setFooter({text: 'Weather data by Open-Meteo.com (https://open-meteo.com/)'});

    forecastEmbed.setTitle('Weather Forecast')
      .setDescription(`-# ${name} (${meteoData.timezone})`)
      .setColor(Colors.Aqua)
      .addFields(meteoData.daily.slice(1,4).map( day => {
        return { name: day.localeTime.toDateString(), value: formatWeather(day), inline: true };
      }))
      .setFooter({text: 'Weather data by Open-Meteo.com (https://open-meteo.com/)'});
    
    getAlerts(codedLocation.lat, codedLocation.lon).then(({features}) => {
      if (features.length > 0) {
        alertsButton.setDisabled(false);
        const alerts = `${features.map(feature => feature.properties.event )}`;
        currentEmbed.addFields([{name: 'Alerts', value: alerts, inline: false }]);
        todayEmbed.addFields([{name: 'Alerts', value: alerts, inline: false }]);
        hourlyEmbed.addFields([{name: 'Alerts', value: alerts, inline: false }]);
        alertsEmbed.setTitle('USA NWS Alerts')
          .setDescription(alerts)
          .setColor(Colors.Red)
          .addFields(features.map(feature => {
            return { name: feature.properties.event, value: feature.properties.description, inline: true };
          }))
          .setFooter({text: 'Data by Weather.gov (https://api.weather.gov/openapi.json)'});
        interaction.editReply({embeds: [ACTIVE_EMBED], components}).catch(console.error);
      }
    }).catch(console.warn);
    ACTIVE_EMBED = currentEmbed;
    interaction.editReply({ embeds: [currentEmbed], components}).catch(console.warn);

    const filter = buttonInteract => Object.values(BUTTON_IDS).map(bid=>`${bid}_${id}`).includes(buttonInteract.customId) && buttonInteract.user.id === member.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 90000 });
    collector.on('collect', async buttonInteract => {
      if (buttonInteract.customId === `${BUTTON_IDS.FORECAST}_${id}`) {
        ACTIVE_EMBED = forecastEmbed;
      } else if (buttonInteract.customId === `${BUTTON_IDS.TODAY}_${id}`) {
        ACTIVE_EMBED = todayEmbed;
      } else if (buttonInteract.customId === `${BUTTON_IDS.HOURLY}_${id}`) {
        ACTIVE_EMBED = hourlyEmbed;
      } else if (buttonInteract.customId === `${BUTTON_IDS.CURRENT}_${id}`) {
        ACTIVE_EMBED = currentEmbed;
      } else if (buttonInteract.customId === `${BUTTON_IDS.ALERTS}_${id}`) {
        ACTIVE_EMBED = alertsEmbed;
      }
      await buttonInteract.update({ embeds: [ACTIVE_EMBED] }).catch(console.error);
    });
    collector.on('end', () => {
      interaction.editReply({components:[]}).catch(console.warn);
    });
  }).catch((error) => {
    interaction.editReply(`${error}`).catch(console.warn);
  });
};

module.exports.getCommandData = () => {
  const options = [
    {
      name: OPTIONS.LOCATION,
      type: ApplicationCommandOptionType.String,
      description: 'Location (Will remember last used location)',
      required: false
    }

  ];
  return {
    name: COMMAND_NAME,
    description: 'Get a weather forcast. *Will show town names in chat!*',
    default_permission: true,
    type: ApplicationCommandType.ChatInput,
    options,
  };
};

module.exports.execute = async (client, interaction) => {
  await interaction.deferReply().catch(console.warn);
  const { id, member } = interaction;

  const savedLocation = await weatherTable.asyncGet(member.id).catch(console.error) ?? false;
  const location = interaction.options.get(OPTIONS.LOCATION)?.value ?? false;
  const remember = true;

  const codedLocations = location ? await getLocation(location).catch(console.error) ?? false : [savedLocation];


  if (codedLocations.length > 1 && codedLocations[0].name) {
    const locations = codedLocations.map(({name})=>`"${name}" `);
    const locationsRow = new ActionRowBuilder();
    const locationButtonMap = {};

    codedLocations.map((location, index) => {
      const buttonId = `${id}_${index}`;
      locationButtonMap[buttonId] = location.name;
      locationsRow.addComponents(new ButtonBuilder({
        label: location.name,
        customId: buttonId,
        style: ButtonStyle.Secondary,
        disabled: false
      }));
    });

    interaction.editReply({
      content: `Found multiple places with that name: ${locations}`,
      components: [locationsRow],
    }).catch(console.error);

    const filter = buttonInteract => Object.keys(locationButtonMap).includes(buttonInteract.customId) && buttonInteract.user.id === member.id;
    const collector = interaction.channel.createMessageComponentCollector({filter, time: 90000 });
    collector.on('collect', async buttonInteract => {

      const locationName = locationButtonMap[buttonInteract.customId];
      if (locationName) {
        buttonInteract.update({content: `Using ${locationName}`, components:[]}).catch(console.error);
        const codedLocation = codedLocations.find((location) => location.name === locationName);
        const {name, lat, lon} = codedLocation;
        if(remember) {
          buttonInteract.update({content: `Saving ${locationName}`, components:[]}).catch(console.error);
          const setLocName = await saveLocation(member.id, name, lon, lat).then().catch((e) => {
            buttonInteract.editReply({
              components: [],
              content: e
            }).catch(console.error);
          });
          buttonInteract.editReply({
            components: [],
            content: `Location set to ${setLocName}`,
            ephemeral: true
          }).catch(console.error);
        }
        reportWeather(interaction, codedLocation).catch(console.error);
      } else {
        buttonInteract.update({content: 'Oops, I messed up.', components:[]}).catch(console.error);
      }
    });

    collector.on('end', () => {
      console.log('Collect end');
    });
  } else if( codedLocations.length === 1 && codedLocations[0]?.name ) {
    if (remember) {
      const {name, lon, lat} = codedLocations[0];
      saveLocation(member.id, name, lon, lat).then().catch((e) => {
        interaction.editReply({
          content: e
        }).catch(console.error);
      });
    }
    reportWeather(interaction, codedLocations[0]);
  } else {
    interaction.editReply('Location wasn\'t found.');
    return;
  }
};

module.exports.dev = false;
