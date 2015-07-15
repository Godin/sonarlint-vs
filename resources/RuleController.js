window.onhashchange = function () {
    controller.hashChanged();
};
var container = document.getElementById("sidebar-container");
container.onscroll = function (ev) {
    container.scrollLeft = 0;
};
location.parseHash = function () {
    var hash = (this.hash || '').replace(/^#/, '').split('&'), parsed = {};
    for (var i = 0, el; i < hash.length; i++) {
        el = hash[i].split('=');
        parsed[el[0]] = el[1];
    }
    return parsed;
};
var Controllers;
(function (Controllers) {
    var RuleController = (function () {
        function RuleController(defaultVersion) {
            this.defaultVersion = defaultVersion;
            var hash = {
                version: this.defaultVersion,
                ruleId: null
            };
            var parsedHash = location.parseHash();
            if (parsedHash.version) {
                hash.version = parsedHash.version;
            }
            if (parsedHash.ruleId) {
                hash.ruleId = parsedHash.ruleId;
            }
            this.openRequestedPage(hash);
        }
        RuleController.prototype.openRequestedPage = function (hash) {
            if (!hash.ruleId || !hash.version) {
                this.handleError();
                return;
            }
            //display page:
            var self = this;
            var requestedVersion = hash.version;
            if (!(new RegExp(/^([a-zA-Z0-9-\.]+)$/)).test(requestedVersion)) {
                this.handleError();
                return;
            }
            this.getRulesJson(requestedVersion, function () {
                self.displayMenu(hash);
                self.displayRulePage(hash);
            });
        };
        RuleController.prototype.displayMenu = function (hash) {
            var menu = document.getElementById("rule-menu");
            var currentVersion = menu.getAttribute("data-version");
            if (currentVersion == this.currentVersion) {
                return;
            }
            var listItems = '';
            for (var i = 0; i < this.currentRules.length; i++) {
                listItems += '<li><a href="#version=' + this.currentVersion + '&ruleId=' + this.currentRules[i].Key + '" title="' + this.currentRules[i].Title + '">' + this.currentRules[i].Title + '</a></li>';
            }
            menu.innerHTML = listItems;
            menu.setAttribute("data-version", this.currentVersion);
        };
        RuleController.prototype.displayRulePage = function (hash) {
            var doc = document.documentElement;
            var left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
            var top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
            for (var i = 0; i < this.currentRules.length; i++) {
                if (this.currentRules[i].Key == hash.ruleId) {
                    //we have found it
                    document.getElementById("rule-id").innerHTML = this.currentRules[i].Key;
                    document.getElementById("rule-title").innerHTML = this.currentRules[i].Title;
                    var tags = document.getElementById("rule-tags");
                    tags.innerHTML = this.currentRules[i].Tags;
                    if (this.currentRules[i].Tags) {
                        tags.style.visibility = 'visible';
                    }
                    else {
                        tags.style.visibility = 'hidden';
                    }
                    document.getElementById("rule-description").innerHTML = this.currentRules[i].Description;
                    window.scrollTo(left, 0);
                    return;
                }
            }
            this.handleError();
        };
        RuleController.prototype.handleError = function () {
            document.getElementById("rule-id").innerHTML = "ERROR";
            document.getElementById("rule-title").innerHTML = "";
            var tags = document.getElementById("rule-tags");
            tags.innerHTML = "";
            tags.style.visibility = 'hidden';
            document.getElementById("rule-description").innerHTML = "";
            var menu = document.getElementById("rule-menu");
            menu.innerHTML = "";
            menu.setAttribute("data-version", "");
        };
        RuleController.prototype.hashChanged = function () {
            var hash = {
                version: this.defaultVersion,
                ruleId: null
            };
            var parsedHash = location.parseHash();
            if (parsedHash.version) {
                hash.version = parsedHash.version;
            }
            if (parsedHash.ruleId) {
                hash.ruleId = parsedHash.ruleId;
            }
            this.openRequestedPage(hash);
        };
        RuleController.prototype.getRulesJson = function (version, callback) {
            if (this.currentVersion != version) {
                var self = this;
                //load file
                this.loadJSON('../rules/' + version + '/rules.json', function (jsonString) {
                    self.currentVersion = version;
                    self.currentRules = JSON.parse(jsonString);
                    callback();
                });
                return;
            }
            callback();
        };
        RuleController.prototype.loadJSON = function (path, callback) {
            var xobj = new XMLHttpRequest();
            xobj.overrideMimeType("application/json");
            xobj.open('GET', path, true);
            xobj.onload = function () {
                callback(xobj.responseText);
            };
            xobj.send(null);
        };
        return RuleController;
    })();
    Controllers.RuleController = RuleController;
})(Controllers || (Controllers = {}));
var controller = new Controllers.RuleController("0.10.0-RC");
//# sourceMappingURL=RuleController.js.map