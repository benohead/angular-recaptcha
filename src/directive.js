/*global angular, Recaptcha */
(function (ng) {
    'use strict';

    var app = ng.module('vcRecaptcha');

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