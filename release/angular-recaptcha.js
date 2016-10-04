/**
 * angular-recaptcha build:2016-10-04 
 * https://github.com/benohead/angular-recaptcha 
 * Copyright (c) 2016 VividCortex 
**/

/*global angular, Recaptcha */
(function (ng) {
    'use strict';

    ng.module('vcRecaptcha', []);

}(angular));

/*global angular */
(function (ng) {
    'use strict';

    function throwNoKeyException() {
        throw new Error('You need to set the "key" attribute to your public reCaptcha key. If you don\'t have a key, please get one from https://www.google.com/recaptcha/admin/create');
    }

    var app = ng.module('vcRecaptcha');

    /**
     * An angular service to wrap the reCaptcha API
     */
    app.provider('vcRecaptchaService', function(){
        var provider = this;
        var config = {};

        /**
         * Sets the reCaptcha configuration values which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param defaults  object which overrides the current defaults object.
         */
        provider.setDefaults = function(defaults){
            angular.copy(config, defaults);
        };

        /**
         * Sets the reCaptcha key which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param siteKey  the reCaptcha public key (refer to the README file if you don't know what this is).
         */
        provider.setSiteKey = function(siteKey){
            config.key = siteKey;
        };

        /**
         * Sets the reCaptcha theme which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param theme  The reCaptcha theme.
         */
        provider.setTheme = function(theme){
            config.theme = theme;
        };

        /**
         * Sets the reCaptcha stoken which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param stoken  The reCaptcha stoken.
         */
        provider.setStoken = function(stoken){
            config.stoken = stoken;
        };

        /**
         * Sets the reCaptcha size which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param size  The reCaptcha size.
         */
        provider.setSize = function(size){
            config.size = size;
        };

        /**
         * Sets the reCaptcha type which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param type  The reCaptcha type.
         */
        provider.setType = function(type){
            config.type = type;
        };

        /**
         * Sets the reCaptcha configuration values which will be used by default is not specified in a specific directive instance.
         *
         * @since 2.5.0
         * @param onLoadFunctionName  string name which overrides the name of the onload function. Should match what is in the recaptcha script querystring onload value.
         */
        provider.setOnLoadFunctionName = function(onLoadFunctionName){
            provider.onLoadFunctionName = onLoadFunctionName;
        };

        provider.$get = ['$rootScope','$window', '$q', '$log', '$interval', function ($rootScope, $window, $q, $log, $interval) {
			var recaptcha = null, loaded = false, iterationTimeout = 40;

            var callback = function () {
                recaptcha = $window.grecaptcha;

                deferred.resolve(recaptcha);
            };

			function getRecaptcha() {
				return $q.when(loaded)
					.then(function () {
						$log.debug('Returning reCatpcha window object');
						return recaptcha = $window.grecaptcha;
					})
			}

            function validateRecaptchaInstance() {
                if (!recaptcha) {
                    throw new Error('reCaptcha has not been loaded yet.');
                }
            }

			function loadScript(url) {
				loaded = false;
				var deferred = $q.defer();
				// Adding the script tag to the head as suggested before
				var head = document.getElementsByTagName('head')[0];
				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = url;

				function callback() {
					$log.debug('reCaptcha script loaded, waiting for window.grecaptcha');
					var iterations = 0;
					var waitPromise = $interval(function () {
						iterations++;
						if (!!$window.grecaptcha) {
							$interval.cancel(waitPromise);
							$log.debug('window.grecaptcha exists!');
							loaded = true;
							deferred.resolve(script);
						} else if (iterations >= iterationTimeout) {
							$interval.cancel(waitPromise);
							$log.error('TIMEOUT - waiting for window.grecaptcha');
						}
					}, 250);
				}

				// Then bind the event to the callback function.
				// There are several events for cross browser compatibility.
				script.onreadystatechange = callback;
				script.onload = callback;

				// Fire the loading
				head.appendChild(script);

				//modification so we can remove this after
				return deferred.promise;
			}

			/**
			 * Creates a new reCaptcha object
			 *
			 * @param elm  the DOM element where to put the captcha
			 * @param conf the captcha object configuration
			 * @throws NoKeyException    if no key is provided in the provider config or the directive instance (via attribute)
			 */
			function create(elm, conf) {

				conf.sitekey = conf.key || config.key;
				conf.theme = conf.theme || config.theme;
				conf.stoken = conf.stoken || config.stoken;
				conf.size = conf.size || config.size;
				conf.type = conf.type || config.type;

				if (!conf.sitekey || conf.sitekey.length !== 40) {
					throwNoKeyException();
				}
				return getRecaptcha().then(function (recaptcha) {
					validateRecaptchaInstance();
					return recaptcha.render(elm, conf);
				});
			}

			/**
			 * Reloads the reCaptcha
			 */
			function reload(widgetId) {
				validateRecaptchaInstance();

				// $log.info('Reloading captcha');
				recaptcha.reset(widgetId);

				// Let everyone know this widget has been reset.
				$rootScope.$broadcast('reCaptchaReset', widgetId);
			}

			/**
			 * Gets the response from the reCaptcha widget.
			 *
			 * @see https://developers.google.com/recaptcha/docs/display#js_api
			 *
			 * @returns {String}
			 */
			function getResponse(widgetId) {
				validateRecaptchaInstance();

				return recaptcha.getResponse(widgetId);
			}
			
			return {
				create: create,
				reload: reload,
				getResponse: getResponse,
				loadScript: loadScript
            };

        }];
    });

	app.directive('vcRecaptcha', ['$document', '$timeout', '$log', 'vcRecaptchaService', function ($document, $timeout, $log, vcRecaptchaService) {

        return {
            restrict: 'A',
            require: "?^^form",
            scope: {
                response: '=?ngModel',
                key: '=?',
                stoken: '=?',
                theme: '=?',
                size: '=?',
                type: '=?',
                tabindex: '=?',
                required: '=?',
                onCreate: '&',
                onSuccess: '&',
                onExpire: '&',
                language: '='
            },
            link: function (scope, elm, attrs, ctrl) {
                scope.widgetId = null;
                scope.script = null;
                scope.removeLanguageListener = null;

                if(ctrl && angular.isDefined(attrs.required)){
                    scope.$watch('required', validate);
                }

                scope.removeLanguageListener = scope.$watch('language', function (language) {
                    if (!language) {
                        $log.warn('Language not defined! Using english as fallback');
                        language = 'en';
                    } else {
                        $log.debug('Language changed to: ' + language + ' - Refreshing reCaptcha');
                    }
                    destroy();
                    init(language);
                });

                function init(language) {
                    var url = "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit&hl=" + language;
                    vcRecaptchaService.loadScript(url).then(function (loadedScript) {
						scope.script = loadedScript;

						var callback = function (gRecaptchaResponse) {
							// Safe $apply
							$timeout(function () {
								scope.response = gRecaptchaResponse;
								validate();

								// Notify about the response availability
								scope.onSuccess({response: gRecaptchaResponse, widgetId: scope.widgetId});
							});
						};

						vcRecaptchaService.create(elm[0], {

							callback: callback,
							key: scope.key,
							stoken: scope.stoken || attrs.stoken || null,
							theme: scope.theme || attrs.theme || null,
							type: scope.type || attrs.type || null,
							tabindex: scope.tabindex || attrs.tabindex || null,
							size: scope.size || attrs.size || null,
							'expired-callback': expired

						}).then(function (widgetId) {
							// The widget has been created
							validate();
							scope.widgetId = widgetId;
							scope.onCreate({widgetId: widgetId});

							scope.$on('$destroy', destroy);

							scope.$on('reCaptchaReset', function(resetWidgetId){
							  if(angular.isUndefined(resetWidgetId) || widgetId === resetWidgetId){
								scope.response = "";
								validate();
							  }
							})

						});

						if (angular.isUndefined(scope.language)) {
							//If language was not bound, no need to listen for changes any more
							scope.removeLanguageListener();
						}
					});
				}

                function destroy() {
                  if (ctrl) {
                    // reset the validity of the form if we were removed
                    ctrl.$setValidity('recaptcha', null);
                  }

                  cleanup();
                }

                function expired(){
                    scope.response = "";
                    validate();

                    // Notify about the response availability
                    scope.onExpire({widgetId: scope.widgetId});
                }

                function validate(){
                    if(ctrl){
                        ctrl.$setValidity('recaptcha', scope.required === false ? null : Boolean(scope.response));
                    }
                }

                function cleanup() {
                    // removes elements reCaptcha added.
                    elm.empty();

                    if (scope.script) {
                        angular.element(scope.script).remove();
                    }
                }
            }
        };
    }]);

}(angular));