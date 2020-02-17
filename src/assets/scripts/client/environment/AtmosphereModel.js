import _inRange from 'lodash/inRange';
import { ENVIRONMENT } from '../constants/environmentConstants';
import { vectorize_2d, vscale } from '../math/vector';
import { degreesToRadians } from '../utilities/unitConverters';

/**
 * Manages all atmospheric properties of the air the aircraft fly through
 *
 * @class AtmosphereModel
 */
export default class AtmosphereModel {
    /**
     * @for AtmosphereModel
     * @constructor
     * @param {object} data
     */
    constructor(data) {
        /**
         * @for AtmosphereModel
         * @property _seaLevelTemperature
         * @type {Number} degrees K
         * @private
         */
        this._seaLevelTemperature = ENVIRONMENT.DEFAULT_SEA_LEVEL_TEMPERATURE_K;

        /**
         * @for AtmosphereModel
         * @property _seaLevelPressure
         * @type {Number} inHg
         * @private
         */
        this._seaLevelPressure = ENVIRONMENT.DEFAULT_SEA_LEVEL_PRESSURE_INHG;

        /**
         * @for AtmosphereModel
         * @property _seaLevelWindVector
         * @type {Array} [x component in kts, y component in kts] scaled wind vector
         * @private
         */
        // this._seaLevelWindVector = ENVIRONMENT.DEFAULT_SEA_LEVEL_WIND_VECTOR_KT;

        // https://www.digitaldutch.com/atmoscalc/index.htm
        // TODO: Combine these into a single object, eg #_atmosphere[altitude] with these as the keys
        this._densityGradient = {};
        this._pressureGradient = {};
        // this._soundSpeedGradient = {};
        this._temperatureGradient = {};
        // this._windGradient = {};

        return this._init(data);
    }

    /**
     * @for AtmosphereModel
     * @method _init
     * @param {object} data
     * @chainable
     * @private
     */
    _init(data) {
        this._initTemperatureFromSurfaceTemperature(data.surfaceTemperature, data.surfaceElevation);
        this._initWindFromSurfaceWind(data.surfaceWind, data.surfaceElevation);
        this._initPressureGradient();
        this._initTemperatureGradient();
        this._initDensityGradient();
        // this._initSoundSpeedGradient();
        // this._initWindGradient();

        // this.windsAloft = _defaultTo(data.windsAloft, {});

        return this;
    }

    _initDensityGradient() {
        this._densityGradient = {};

        for (let alt = -2000; alt <= 65617; alt++) {
            this._densityGradient[alt] = 11.796888418 * this._pressureGradient[alt] / this._temperatureGradient[alt];
        }
    }

    /**
     * Initialize the pressure gradient, calculating air pressure through all altitudes in 1ft increments
     *
     * https://www.translatorscafe.com/unit-converter/en-US/calculator/altitude/#pressure-vs-altitude
     * https://en.wikipedia.org/wiki/Barometric_formula    (variable values given in imperial units)
     * https://www.mide.com/air-pressure-at-altitude-calculator    (for comparing calculated against actual)
     *
     * @for AtmosphereModel
     * @method _initPressureGradient
     * @private
     */
    _initPressureGradient() {
        this._pressureGradient = {};
        const b0ReferencePressure = this._seaLevelPressure;
        const b0ReferenceTemperature = this._seaLevelTemperature;
        const b1ReferencePressure = this._seaLevelPressure *
            ((b0ReferenceTemperature - (0.00198121311 * 36089)) /
            b0ReferenceTemperature) ** 5.255876329;

        // for b=0 layer of atmosphere ("Troposphere")
        for (let alt = -2000; alt < 36089; alt++) {
            this._pressureGradient[alt] = b0ReferencePressure *
                ((b0ReferenceTemperature - (0.00198121311 * alt)) /
                b0ReferenceTemperature) ** 5.255876329;
        }

        // for b=1 layer of atmosphere ("Stratosphere I")
        for (let alt = 36089; alt <= 65617; alt++) {
            this._pressureGradient[alt] = b1ReferencePressure * (Math.E ** (-0.0000480634303 * (alt - 36089)));
        }
    }

    /**
     * @for AtmosphereModel
     * @method _initTemperatureFromSurfaceTemperature
     * @param {number} surfaceTemperature - temperature at provided elevation (degrees C)
     * @param {number} surfaceElevation - elevation of the provided pressure (ft above MSL)
     * @private
     */
    _initTemperatureFromSurfaceTemperature(surfaceTemperature, /* surfaceElevation */) {
        if (typeof surfaceTemperature === 'undefined') {
            this._seaLevelTemperature = ENVIRONMENT.DEFAULT_SEA_LEVEL_TEMPERATURE;
        }

        this._seaLevelTemperature = 'calculated new value';
    }

    /**
     * Initialize the temperature gradient, calculating air temperature through all altitudes in 1ft increments
     *
     * https://www.translatorscafe.com/unit-converter/en-US/calculator/altitude/#temperature-vs-altitude
     *
     * @for AtmosphereModel
     * @method _initTemperatureGradient
     * @private
     */
    _initTemperatureGradient() {
        this._temperatureGradient = {};

        // for b=0 layer of atmosphere ("Troposphere")
        for (let alt = -2000; alt < 36089; alt++) {
            this._temperatureGradient[alt] = this._seaLevelTemperature - (0.00198121311 * alt);
        }

        // for b=1 layer of atmosphere ("Stratosphere I")
        for (let alt = 36089; alt <= 65617; alt++) {
            this._temperatureGradient[alt] = this._seaLevelTemperature - (0.00198121311 * 36089);
        }
    }

    /**
     * @for AtmosphereModel
     * @method _initWindFromSurfaceWind
     * @param {object} surfaceWind - wind at provided elevation, formatted as `{angle: 0, speed: 5}`; angle=radians, speed=kts
     * @param {number} surfaceElevation - elevation of the provided pressure (ft above MSL)
     * @private
     */
    _initWindFromSurfaceWind(surfaceWind, /* surfaceElevation */) {
        if (typeof surfaceWind === 'undefined') {
            this._seaLevelWindVector = ENVIRONMENT.DEFAULT_SEA_LEVEL_WIND_VECTOR;
        }

        this._seaLevelWindVector = vscale(vectorize_2d(degreesToRadians(surfaceWind.angle)), surfaceWind.speed);
    }

    _initWindGradient() {
        //
    }

    getActualAltitudeForPressureAltitude(/* pressureAltitude */) {
        //
    }

    getPressureAltitudeForActualAltitude(/* actualAltitude */) {
        //
    }

    getDensityAltitudeForActualAltitude(/* actualAltitude */) {
        //
    }

    getTemperatureAtActualAltitude(actualAltitude) {
        if (!_inRange(actualAltitude, -2000, 65617)) {
            throw new TypeError(`Expected altitude within -2000 ft to 65617 ft, but received altitude of ${actualAltitude}`);
        }

        return this._temperatureGradient[actualAltitude];
    }

    getSoundSpeedAtActualAltitude(/* actualAltitude */) {
        //
    }

    getWindAtActualAltitude(/* actualAltitude */) {
        //
    }
}
