'use strict';

describe('errorsServices', function() {

	beforeEach(module('angular-errors-services'));

	describe('errorsConfig', function() {
		var service;

		beforeEach(inject(function(errorsConfig) {
			service = errorsConfig;
		}));

		describe('getConfiguration', function() {

			it('should return not null configuration', function() {
				expect(service.getConfiguration()).not.toBe(null);
			});

			it('should return a configuration with a falsy log property', function() {
				expect(service.getConfiguration().log).toBe(false);
			});

			it('should return a configuration with an empty apiEndPoint property', function() {
				expect(service.getConfiguration().apiEndPoint).toBe('');
			});

			it('should return a configuration with an empty app property', function() {
				expect(service.getConfiguration().app).toBe('');
			});
		});

		describe('setConfiguration', function() {
			var newConfig = {
				apiEndPoint: 'new_api_end_point',
				log: true,
				app: 'app'
			};

			beforeEach(function() {
				service.setConfiguration(newConfig);
			});

			it('should set configuration apiEndPoint property with new value', function() {
				expect(service.getConfiguration().apiEndPoint).toBe(newConfig.apiEndPoint);
			});

			it('should set configuration log property with new value', function() {
				expect(service.getConfiguration().log).toBe(newConfig.log);
			});

			it('should set configuration app property with new value', function() {
				expect(service.getConfiguration().app).toBe(newConfig.app);
			});
		});
	});

	describe('errorsLogger', function() {
		var service, errorsConfig, $http;

		beforeEach(inject(function(errorsLogger, _errorsConfig_, _$http_) {
			service = errorsLogger;
			errorsConfig = _errorsConfig_;
			$http = _$http_;

			spyOn(errorsConfig, 'getConfiguration');	
			spyOn($http, 'post');		
		}));

		describe('log', function() {

			describe('config log property is falsy', function() {

				beforeEach(function() {
					errorsConfig.getConfiguration.and.returnValue({
						log: false
					});
				});

				it('should not send any request', function() {
					service.log('anyResponse');

					expect($http.post).not.toHaveBeenCalled();		
				});
			});

			describe('config log property is truthy', function() {

				beforeEach(function() {
					errorsConfig.getConfiguration.and.returnValue({
						log: true,
						app: 'app',
						apiEndPoint: 'apiEndPoint'
					});
				});

				it('should not send any request when response config url property is exactly apiEndPoint', function() {
					service.log({
						config: {
							url: 'apiEndPoint'
						}
					});

					expect($http.post).not.toHaveBeenCalled();		
				});

				it('should send a POST request to apiEndPoint with the error as an string', function() {
					var error = {
						anyProperty: 'anyValue'
					};		

					service.log({
						data: error,
						config: {
							url: 'anyUrl',
						}
					})

					expect($http.post).toHaveBeenCalledWith(
						'apiEndPoint', {
							appIdentifier: 'app',
							error: JSON.stringify(error)
						}
					);
				});
			});			
		});		
	});

	describe('forbiddenRequestProcessor', function() {
		var service;

		beforeEach(inject(function(forbiddenRequestProcessor) {
			service = forbiddenRequestProcessor;
		}));

		describe('process', function() {

			describe('forbidden', function() {
				var response = {
					status: 403
				};

				beforeEach(function() {
					service.process(response);
				});

				it('should replace the response data property for a generic message', function() {
					expect(response.data).toBe('You have no power here!');
				});
			});

			describe('otherwise', function() {
				var response = {
					status: 'anyStatus',
					data: 'anyData'
				};

				beforeEach(function() {
					service.process(response);
				});

				it('should not replace the response data property', function() {
					expect(response.data).toBe('anyData');
				});
			});
		});
	});

	describe('badRequestProcessor', function() {
		var service;

		beforeEach(inject(function(badRequestProcessor) {
			service = badRequestProcessor;
		}));

		describe('process', function() {

			describe('bad request', function() {
				var response = {
					status: 400,
					data: {
						validationErrors: [{
							propertyName: 'anyProperty',
							errorDescription: 'anyDescription'
						}]
					},
					config: {}
				};

				beforeEach(function() {
					service.process(response);
				});

				it('should add errors property @ response config with all validation errors', function() {
					expect(response.config.errors.length).toBe(1);
				});	

				it('should replace the response data property for a generic error message', function() {
					expect(response.data).toBe('Check errors for more details');
				});
			});	

			describe('otherwise', function() {
				var response = {
					status: 'anyStatus',
					data: 'anyData',
					config: {}
				};

				beforeEach(function() {
					service.process(response);
				});

				it('should not add errors property @ response config', function() {
					expect(response.config.errors).toBe(undefined);
				});	

				it('should not replace the response data property', function() {
					expect(response.data).toBe('anyData');
				});
			});			
		});
	});

	describe('internalServerErrorProcessor', function() {
		var service, errorsLogger;

		beforeEach(inject(function(internalServerErrorProcessor, _errorsLogger_) {
			service = internalServerErrorProcessor;
			errorsLogger = _errorsLogger_;

			spyOn(errorsLogger, 'log');
		}));

		describe('process', function() {

			describe('internal server error', function() {

				describe('unknown', function() {
					var response;

					beforeEach(function() {
						service.process(response = {
							status: 500,
							data:  {
								code: 'UNKNOWN',
								description: 'errorDescription'
							}
						});
					});

					it('should invoke log from errorsLogger passing response data property as argument', function() {
						expect(errorsLogger.log).toHaveBeenCalledWith({
							code: 'UNKNOWN',
							description: 'errorDescription'
						});
					});

					it('should replace the response data property with generic error message', function(){
						expect(response.data).toBe('An unexpected error has occurred');
					});
				});

				describe('api error code', function() {
					var response;

					beforeEach(function() {
						service.process(response = {
							status: 500,
							data:  {
								code: 'anyCode',
								description: 'errorDescription'
							}
						});
					});

					it('should not invoke log from errorsLogger', function() {
						expect(errorsLogger.log).not.toHaveBeenCalled();
					});

					it('should replace the response data property with description property', function(){
						expect(response.data).toBe('errorDescription');
					});
				});
			});

			describe('otherwise', function() {
				var response = {
					status: 'anyStatus',
					data: 'anyData'
				};

				beforeEach(function() {
					service.process(response);
				});

				it('should not invoke log from errorsLogger',function() {
					expect(errorsLogger.log).not.toHaveBeenCalled();				
				});

				it('should not replace the response data property', function() {
					expect(response.data).toBe('anyData');
				});
			});
		});
	});

	describe('errorsManager', function() {
		var service, 
			forbiddenRequestProcessor, badRequestProcessor, internalServerErrorProcessor;

		beforeEach(inject(function(errorsManager, _forbiddenRequestProcessor_, _badRequestProcessor_, _internalServerErrorProcessor_){
			service = errorsManager;
			forbiddenRequestProcessor = _forbiddenRequestProcessor_;
			badRequestProcessor =_badRequestProcessor_;
			internalServerErrorProcessor = _internalServerErrorProcessor_;

			spyOn(forbiddenRequestProcessor, 'process');
			spyOn(badRequestProcessor, 'process');
			spyOn(internalServerErrorProcessor, 'process');
		}));

		describe('processError', function() {

			describe('forbidden request', function() {
				var response = {
					status: 403
				};

				beforeEach(function() {
					service.processError(response);
				});

				it('should invoke process from forbiddenRequestProcessor', function() {
					expect(forbiddenRequestProcessor.process).toHaveBeenCalledWith(response);
				});

				it('should not invoke process from badRequestProcessor', function() {
					expect(badRequestProcessor.process).not.toHaveBeenCalled();
				});

				it('should not invoke process from internalServerErrorProcessor', function() {
					expect(internalServerErrorProcessor.process).not.toHaveBeenCalled();
				});
			});

			describe('bad request', function() {
				var response = {
					status: 400
				};

				beforeEach(function() {
					service.processError(response);
				});

				it('should invoke process from badRequestProcessor', function() {
					expect(badRequestProcessor.process).toHaveBeenCalledWith(response);
				});

				it('should not invoke process from forbiddenRequestProcessor', function() {
					expect(forbiddenRequestProcessor.process).not.toHaveBeenCalled();
				});
				
				it('should not invoke process from internalServerErrorProcessor', function() {
					expect(internalServerErrorProcessor.process).not.toHaveBeenCalled();
				});
			});

			describe('internal server error', function() {
				var response = {
					status: 500
				};

				beforeEach(function() {
					service.processError(response);
				});

				it('should invoke process from internalServerErrorProcessor', function() {
					expect(internalServerErrorProcessor.process).toHaveBeenCalledWith(response);
				});

				it('should not invoke process from forbiddenRequestProcessor', function() {
					expect(forbiddenRequestProcessor.process).not.toHaveBeenCalled();
				});

				it('should not invoke process from badRequestProcessor', function() {
					expect(badRequestProcessor.process).not.toHaveBeenCalled();
				});			
			});
		});
	});

	describe('errorsRequestInterceptor', function() {
		var service, errorsManager, $q;

		beforeEach(inject(function(errorsRequestInterceptor, _errorsManager_, _$q_) {
			service = errorsRequestInterceptor;
			errorsManager= _errorsManager_;
			$q = _$q_;

			spyOn(errorsManager, 'processError');
			spyOn($q, 'reject');
		}));

		describe('responseError', function() {
			
			it('should invoke processError from errorsManager when response status is forbidden', function() {
				var response = {
					status: 403
				};

				service.responseError(response);

				expect(errorsManager.processError).toHaveBeenCalledWith(response);
			});

			it('should invoke processError from errorsManager when response status is bad request', function() {
				var response = {
					status: 400
				};
				
				service.responseError(response);

				expect(errorsManager.processError).toHaveBeenCalledWith(response);
			});

			it('should invoke processError from errorsManager when response status is internal server error', function() {
				var response = {
					status: 500
				};
				
				service.responseError(response);

				expect(errorsManager.processError).toHaveBeenCalledWith(response);
			});

			it('should not invoke processError from errorsManager when response status not one of the expeted ones', function() {
				var response = {
					status: 'anyStatus'
				};
				
				service.responseError(response);

				expect(errorsManager.processError).not.toHaveBeenCalledWith(response);
			});

			it('should invoke reject from $q with the response', function() {
				var response = {
					status: 'anyStatus'
				};

				service.responseError(response);

				expect($q.reject).toHaveBeenCalledWith(response);
			});
		})		
	});
});