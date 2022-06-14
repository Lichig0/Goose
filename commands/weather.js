const path = require('path');
const { MessageEmbed, Constants: {ApplicationCommandTypes, ApplicationCommandOptionTypes}, MessageButton, MessageActionRow, Util } = require('discord.js');
const weatherTable = require('../dbactions/weatherTable');
const https = require('https');
const url = require('url');
const math = require('mathjs');


const COMMAND_NAME = path.basename(__filename, '.js');
const OPTIONS = {
  LOCATION: 'location',
  REMEMBER: 'remember'
};
const BUTTON_IDS = {
  CURRENT: 'weatherCurrent',
  FORECAST: 'weatherForecast',
  ALERTS: 'weatherAlerts',
  LOCATION: 'weatherLocation',
};

const currentButton = new MessageButton({
  label: 'Current',
  customId: BUTTON_IDS.CURRENT,
  style: 'SUCCESS',
  disabled: false,
});
const alertsButton = new MessageButton({
  label: 'Alerts',
  customId: BUTTON_IDS.ALERTS,
  style: 'DANGER',
  disabled: true,
});
const forecastButton = new MessageButton({
  label: 'Forecast',
  customId: BUTTON_IDS.FORECAST,
  style: 'PRIMARY',
  disabled: false,
});
const locationButton = new MessageButton({
  label: 'LOCATION_',
  customId: BUTTON_IDS.LOCATION,
  style: 'SECONDARY',
  disabled: false
});

const stringifyCurrent = (json) => {
  const { temp, humidity, weather, rain, snow } = json;
  const { description, /*main, icon*/ } = weather[0];
  const kTemp = math.unit(temp, 'degF');
  const cTemp = Math.round(kTemp.to('degC').toNumber());
  const fTemp = Math.round(kTemp.to('degF').toNumber());
  const snowAccu = math.unit(snow?.['1h'] ?? 0, 'cm');
  const rainAccu = math.unit(rain?.['1h'] ?? 0, 'cm');
  const snowIn = math.unit(math.round((snowAccu.to('in')).toNumber(), 1), 'in');
  const rainIn = math.unit(math.round((rainAccu.to('in')).toNumber(), 1), 'in');

  return `${description}
  🌡${fTemp}°F(${cTemp}°C)
  💧Humidity:${Math.round(humidity)}%
  ${rainAccu ? `🌧️Rain past 1h: ${rainIn}(${rainAccu})` : ''}
  ${snowAccu ? `🌨Snow past 1h: ${snowIn}(${snowAccu})` : ''}`;
};

const stringifyDay = (json) => {

  /*
    {
      "dt": 1618308000, time of forcast UTC
      "sunrise": 1618282134, UTC
      "sunset": 1618333901, UTC
      "moonrise": 1618284960, UTC
      "moonset": 1618339740, UTC
      "moon_phase": 0.04, 0-1, new moon, .25 first quarter, .5 full, etc.
      "temp": { kelven
        "day": 279.79,
        "min": 275.09,
        "max": 284.07,
        "night": 275.09,
        "eve": 279.21,
        "morn": 278.49
      },
      "feels_like": { kelven | C | F
        "day": 277.59,
        "night": 276.27,
        "eve": 276.49,
        "morn": 276.27
      },
      "pressure": 1020, hPa
      "humidity": 81, %
      "dew_point": 276.77, kelvin
      "wind_speed": 3.06, meter/sec | meter/sec | mile/secmat
      "wind_deg": 294, meterological deg
      "weather": [
        {
          "id": 500, code
          "main": "Rain",
          "description": "light rain",
          "icon": "10d" icon
        }
      ],
      "clouds": 56, %
      "pop": 0.2, probability %
      "rain": 0.62, mm (or snow in mm)
      "uvi": 1.93 mx UV index
    }
*/

  const { temp, humidity, weather, pop, snow, rain, wind_speed } = json;
  const { description, /*main, icon*/ } = weather[0];
  const { min, max, /*day, night, min, max, eve, morn*/ } = temp;
  const highK = math.unit(max, 'degF');
  const lowK = math.unit(min, 'degF');
  const highC = Math.round(highK.to('degC').toNumber());
  const highF = Math.round(highK.to('degF').toNumber());
  const lowC = Math.round(lowK.to('degC').toNumber());
  const lowF = Math.round(lowK.to('degF').toNumber());

  const hiString = `🌡Hi:${highF}°F (${highC}°C)`;
  const loString = `🌡Lo:${lowF}°F (${lowC}°C)`;
  const windSpeed = `🌬${math.unit(wind_speed, 'mi/h')}`;
  const humidityString = `💧Humidity:${Math.round(humidity)}%`;
  const chanceOfPre = `🌂Chance of precip: ${Math.round(pop*100)}%`;
  const snowAccu = math.unit(snow ?? 0, 'mm');
  const rainAccu = math.unit(rain ?? 0, 'mm');
  const snowIn = math.unit(math.round((snowAccu.to('in')).toNumber(), 1), 'in');
  const rainIn = math.unit(math.round((rainAccu.to('in')).toNumber(), 1), 'in');

  return `${description}
  ${hiString}\n${loString}\n${windSpeed}\n${humidityString}\n${chanceOfPre}
  ${rainAccu ? `🌧️Rain: ${rainIn}(${rainAccu})` : ''}
  ${snowAccu ? `🌨Snow: ${snowIn}(${snowAccu})` : ''}`;
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
const getWeatherOneCall = function(lat, lon){
  /*
    https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude={part}&appid={API key}
  */
  const requestUrl = url.parse(url.format({
    protocol: 'https',
    hostname: 'api.openweathermap.org',
    pathname: '/data/2.5/onecall',
    query: {
      appid: process.env.OPEN_WEATHER_TOKEN,
      lat,
      lon,
      exclude: 'hourly,minutely',
      units: 'imperial'
    }
  }));
  return new Promise((resolve, reject) => {
    https.get({
      hostname: requestUrl.hostname,
      path: requestUrl.path,
    }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const finishedResponse = JSON.parse(rawData);
          resolve(finishedResponse);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      console.log(err);
      reject('http error', err);
    });
  });

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
  const row = new MessageActionRow();
  const { id, member } = interaction;
  console.log(codedLocation);
  getWeatherOneCall(codedLocation.lat, codedLocation.lon).then(data => {
    const { name } = codedLocation;
    const forecastEmbed = new MessageEmbed();
    // const alertEmbeds = [];
    const alertEmbed = new MessageEmbed();
    const currentEmbed = new MessageEmbed();
    const {current, daily, alerts} = data;

    row.addComponents(currentButton.setCustomId(`${BUTTON_IDS.CURRENT}_${id}`))
      .addComponents(forecastButton.setCustomId(`${BUTTON_IDS.FORECAST}_${id}`))
      .addComponents(alertsButton.setCustomId(`${BUTTON_IDS.ALERTS}_${id}`).setDisabled(!alerts));
    components.push(row);

    currentEmbed.setTitle('Current Conditions')
      .setColor('GREEN')
      .addField('Right Now', stringifyCurrent(current),true)
      .addField('Today', stringifyDay(daily[0]),true)
      .setFooter(`Location: ${name}`);

    forecastEmbed.setTitle('Weather Forecast')
      .setColor('BLURPLE')
      .addField('Today', stringifyDay(daily[0]),true)
      .addField('Tomorrow', stringifyDay(daily[1]),true)
      .addField('The Day After', stringifyDay(daily[2]),true)
      .setFooter(`Location: ${name}`);

    if(alerts) {
      forecastEmbed.addField('Alerts', `${alerts.map(alert=>`${alert.event}`)}`);
      currentEmbed.addField('Alerts', `${alerts.map(alert=>`${alert.event}`)}`);
      alertEmbed.setTitle('Alerts')
        .setColor('RED')
        .setFooter(`Location: ${name}`);
      alerts.map(alert => {
        alertEmbed.addField(alert.event, Util.splitMessage(alert.description, {maxLength: 1000})[0], true);
      });
    }

    interaction.editReply({embeds: [currentEmbed], components}).catch(console.warn);

    const filter = buttonInteract => Object.values(BUTTON_IDS).map(bid=>`${bid}_${id}`).includes(buttonInteract.customId) && buttonInteract.user.id === member.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 90000 });
    collector.on('collect', async buttonInteract => {
      if (buttonInteract.customId === `${BUTTON_IDS.ALERTS}_${id}`) {
        await buttonInteract.update({ embeds: [alertEmbed] }).catch(console.error);
      } else if (buttonInteract.customId === `${BUTTON_IDS.FORECAST}_${id}`) {
        await buttonInteract.update({ embeds: [forecastEmbed] }).catch(console.error);
      } else if (buttonInteract.customId === `${BUTTON_IDS.CURRENT}_${id}`) {
        await buttonInteract.update({ embeds: [currentEmbed] }).catch(console.error);
      }
    });
    collector.on('end', () => {
      interaction.editReply({components:[]}).catch(console.warn);
    });
  }).catch((error) => {
    interaction.editReply(`${error}`).catch(console.warn);
  });
};

export function getCommandData() {
  const options = [
    {
      name: OPTIONS.LOCATION,
      type: ApplicationCommandOptionTypes.STRING,
      description: 'Location',
      required: false
    },
    {
      name: OPTIONS.REMEMBER,
      type: ApplicationCommandOptionTypes.BOOLEAN,
      description: 'Remember this location for you?',
      required: false,
    }

  ];
  return {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: COMMAND_NAME,
    description: '(Beta) Sky is wet?',
    default_permission: true,
    options,
  };
}

export async function execute(client, interaction) {
  await interaction.deferReply().catch(console.warn);
  const { id, member } = interaction;

  const savedLocation = await weatherTable.asyncGet(member.id).catch(console.error) ?? false;
  const location = interaction.options.get(OPTIONS.LOCATION)?.value ?? false;
  const remember = interaction.options.get(OPTIONS.REMEMBER)?.value ?? false;

  const codedLocations = location ? await getLocation(location).catch(console.error) ?? false : [savedLocation];


  if (codedLocations.length > 1 && codedLocations[0].name) {
    const locations = codedLocations.map(({name})=>`"${name}" `);
    const locationsRow = new MessageActionRow();
    const locationButtonMap = {};

    codedLocations.map((location, index) => {
      const buttonId = `${id}_${index}`;
      locationButtonMap[buttonId] = location.name;
      locationsRow.addComponents(locationButton.setCustomId(buttonId).setLabel(location.name));
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
}

export const dev = false;
