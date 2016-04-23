'use strict';

var errorsMain = angular.module('angular-errors-main', [
	'angular-errors-services']);
'use strict';

var errorsServices = angular.module('angular-errors-services', []);

errorsServices.service('errorsConfig', [function(){

	this.configuration = {
		log: false,
		apiEndPoint: '',
		app: ''
	};	

	this.getConfiguration = function() {
		return this.configuration;
	};

	this.setConfiguration = function(config) {
		this.configuration.log = config.log || false,
		this.configuration.apiEndPoint = config.apiEndPoint || '',
		this.configuration.app = config.app || '';
	};
}]);

errorsServices.service('errorsLogger', ['$http', 'errorsConfig',
	function($http, Config){

	this.log = function(response){
		if (!Config.getConfiguration().log) 
			return;

		if (Config.getConfiguration().apiEndPoint === response.config.url) 
			return;

		return $http.post(
			Config.getConfiguration().apiEndPoint, {
				error: JSON.stringify(response.data),
				appIdentifier: Config.getConfiguration().app
			}
		);
	};	
}])

errorsServices.service('forbiddenRequestProcessor', [function() {

	this.process = function(response) {
		if (response.status === 403) {
			response.data = 'You have no power here!';
		}
	};
}]);

errorsServices.service('badRequestProcessor', [function() {

	this.process = function(response) {
		if (response.status === 400) {
			response.config.errors = response.data.validationErrors || [];
			response.data = 'Check errors for more details';
		}
	};
}]);

errorsServices.service('internalServerErrorProcessor', ['errorsLogger', 
	function(errorsLogger){

	this.process = function(response) {
		if (response.status === 500) {
			var errorCode = response.data.code || '';

			if (errorCode === '' || errorCode === 'UNKNOWN') {
				errorsLogger.log(response.data);
				response.data = 'An unexpected error has occurred';
			} else {
				response.data = response.data.description;
			}			
		}
	};
}]);

errorsServices.service('errorsManager', ['forbiddenRequestProcessor', 'badRequestProcessor', 'internalServerErrorProcessor',
	function(forbiddenRequestProcessor, badRequestProcessor, internalServerErrorProcessor){
	
	this.processError = function(response) {
		if (response.status === 400)
			badRequestProcessor.process(response);
		else if (response.status === 403)
			forbiddenRequestProcessor.process(response);
		else if (response.status === 500)
			internalServerErrorProcessor.process(response);
	};
}]);

errorsServices.service('errorsRequestInterceptor', ['$q', 'errorsManager',
	function($q, Manager){

	this.responseError = function(response) {
		if (response.status === 400 || response.status === 403 || response.status === 500) {
			Manager.processError(response);				
		}

		return $q.reject(response);
	};	
}]);