﻿interface UrlParams
{
    version: string;
    ruleId: string;
    tags: string[];
}
interface Rule {
    Key: string;
    Title: string;
    Description: string;
    Tags: string;
}
interface TagFrequency {
    Tag: string;
    Count: number;
}

module Controllers {
    export class RuleController {
        defaultVersion: string;
        constructor(defaultVersion: string) {
            this.defaultVersion = defaultVersion;
            var hash = this.getHash(location.hash || '');
            this.openRequestedPage(hash);
            this.handleSidebarResizing();
            this.handleFilterToggle();
        }

        private handleFilterToggle() {
            $('#rule-menu-filter ul').on('change', 'input', (event) => {
                var item = $(event.currentTarget);
                var checked = item.prop('checked');
                var newHash = this.getHash(location.hash || '');
                newHash.tags = this.getFilterSettings();
                location.hash = this.changeHash(newHash);
            });
        }

        private getFilterSettings(): string[] {
            var turnedOnFilters = [];
            var inputs = $('#rule-menu-filter ul input');
            inputs.each((index, elem) => {
                var item = $(elem);
                var checked = item.prop('checked');
                if (checked) {
                    turnedOnFilters.push(item.attr('id'));
                }
            });

            return turnedOnFilters;
        }

        private handleSidebarResizing() {
            var min = 150;
            var max = 750;
            var mainmin = 200;

            $('#sidebar-resizer').mousedown(function (e) {
                e.preventDefault();
                $(document).mousemove(function (e) {
                    e.preventDefault();
                    var x = e.pageX - $('#sidebar').offset().left;
                    if (x > min && x < max && e.pageX < ($(window).width() - mainmin)) {
                        $('#sidebar').css("width", x);
                        $('#content').css("margin-left", x);
                    }
                })
            });
            $(document).mouseup(function (e) {
                $(document).unbind('mousemove');
            });
        }

        public openRequestedPage(hash: UrlParams) {
            if (!hash.version) {
                this.handleVersionError();
                return;
            }

            var requestedVersion = hash.version;

            if (!(new RegExp(<any>/^([a-zA-Z0-9-\.]+)$/)).test(requestedVersion)) {
                this.handleVersionError();
                return;
            }

            //display page:
            this.getContentsForVersion(requestedVersion, () => {
                this.renderMenu(hash);

                if (!hash.ruleId) {
                    this.renderMainPage(hash);
                    this.fixRuleLinks(hash);
                    document.title = 'SonarLint for Visual Studio - Version ' + hash.version;
                }
                else {
                    this.renderRulePage(hash);
                    this.fixRuleLinks(hash);
                    document.title = 'SonarLint for Visual Studio - Rule ' + hash.ruleId;
                }
            });
        }

        private renderMenu(hash: UrlParams) {
            var menu = $("#rule-menu");
            var currentVersion = menu.attr("data-version");

            if (currentVersion == this.currentVersion)
            {
                this.applyFilters(hash);
                return;
            }

            menu.empty();

            for (var i = 0; i < this.currentRules.length; i++) {
                var li = $(Template.eval(Template.RuleMenuItem, {
                    currentVersion: this.currentVersion,
                    rule: this.currentRules[i]
                }));
                li.data('rule', this.currentRules[i]);
                menu.append(li);
            }

            menu.attr("data-version", this.currentVersion);
            $("#rule-menu-header").html(Template.eval(Template.RuleMenuHeaderVersion, this));

            this.renderFilters(hash);
        }
        private renderMainPage(hash: UrlParams) {
            this.renderMainContent(this.currentDefaultContent, hash);
        }
        private renderRulePage(hash: UrlParams) {
            for (var i = 0; i < this.currentRules.length; i++) {
                if (this.currentRules[i].Key == hash.ruleId) {
                    this.renderMainContent(Template.eval(Template.RulePageContent, this.currentRules[i]), hash);
                    return;
                }
            }
            this.handleRuleIdError(false);
        }

        private renderMainContent(content: string, hash: UrlParams) {
            var doc = document.documentElement;
            var left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);

            document.getElementById("content").innerHTML = content;
            this.fixRuleLinks(hash);

            window.scrollTo(left, 0);
        }

        private renderFilters(hash: UrlParams) {
            var filterList = $('#rule-menu-filter > ul');
            filterList.empty();
            for (var i = 0; i < 10; i++)
            {
                var filter = Template.eval(Template.RuleFilterElement, { tag: this.currentAllTags[i].Tag });
                filterList.append($(filter));
            }
            var others = Template.eval(Template.RuleFilterElement, { tag: 'others' });
            filterList.append($(others));

            this.applyFilters(hash);
        }

        private applyFilters(hash: UrlParams) {
            $('#rule-menu-filter input').each((index, elem) => {
                var input = $(elem);
                input.prop('checked', $.inArray(input.attr('id'), hash.tags) != -1);
            });

            var tagsToFilterFor = this.getTagsToFilterFromHash(hash);
            var tagsWithOwnCheckbox = <string[]>$('#rule-menu-filter input').map((index, element) => { return $(element).attr('id'); }).toArray();
            tagsWithOwnCheckbox.splice(tagsWithOwnCheckbox.indexOf('others'), 1);

            var filterForOthers = hash.tags.indexOf('others') != -1;
            if (filterForOthers) {
                tagsToFilterFor.splice(tagsToFilterFor.indexOf('others'), 1);
                var others = this.diff($.map(this.currentAllTags, (element, index) => { return element.Tag }), tagsWithOwnCheckbox);
                tagsToFilterFor = tagsToFilterFor.concat(others);
            }

            $('#rule-menu li').each((index, elem) => {
                var li = $(elem);
                var liTags = (<Rule>li.data('rule')).Tags;
                var commonTags = this.intersect(liTags.split(','), tagsToFilterFor);

                var hasNoTags = liTags.length == 0;
                var showLiWithNoTags = hasNoTags && filterForOthers;
                var showEverything = tagsToFilterFor.length == 0;
                li.toggle(commonTags.length > 0 || showLiWithNoTags || showEverything);
            });

            $('#rule-menu li:visible').filter(':odd').css({ 'background-color': 'rgb(243, 243, 243)' });
            $('#rule-menu li:visible').filter(':even').css({ 'background-color': 'white' });
        }
        private getTagsToFilterFromHash(hash: UrlParams):string[] {
            var tagsToFilter = hash.tags.slice(0);

            for (var i = tagsToFilter.length - 1; i >= 0; i--) {
                if (tagsToFilter[i] === '') {
                    tagsToFilter.splice(i, 1);
                }
            }
            return tagsToFilter;
        }

        private intersect<T>(a: Array<T>, b: Array<T>): Array<T> {
            var t;
            if (b.length > a.length) t = b, b = a, a = t;
            return a.filter(function (e) {
                if (b.indexOf(e) !== -1) return true;
            });
        }
        private union<T>(a: Array<T>, b: Array<T>): Array<T> {
            var x = a.concat(b);
            return x.filter(function (elem, index) { return x.indexOf(elem) === index; });
        }
        private diff<T>(a: Array<T>, b: Array<T>): Array<T> {
            return a.filter(function (i) { return b.indexOf(i) < 0; });
        }

        private handleRuleIdError(hasMenuIssueToo: boolean) {
            if (hasMenuIssueToo) {
                document.getElementById("content").innerHTML = Template.eval(Template.RuleErrorPageContent, { message: 'Couldn\'t find version' });
            }
            else {
                document.getElementById("content").innerHTML = Template.eval(Template.RuleErrorPageContent, { message: 'Couldn\'t find rule' });
            }
        }
        private handleVersionError() {
            this.handleRuleIdError(true);

            var menu = $('#rule-menu');
            menu.html('');
            menu.attr('data-version', '');
            $('#rule-menu-header').html(Template.eval(Template.RuleMenuHeaderVersionError, null));
            $('#rule-menu-filter').html('');
        }

        public hashChanged() {
            var hash = this.getHash(location.hash || '');
            this.openRequestedPage(hash);
        }

        private fixRuleLinks(hash: UrlParams) {
            $('.rule-link').each((index, elem) => {
                var link = $(elem);
                var currentHref = link.attr('href');
                var newHash = this.getHash(currentHref);
                newHash.tags = hash.tags;

                link.attr('href', '#' + this.changeHash(newHash));
            });
        }

        private getHash(input: string): UrlParams {
            var hash: UrlParams = {
                version: this.defaultVersion,
                ruleId: null,
                tags: null
            };
            var parsedHash = RuleController.parseHash(input);
            if (parsedHash.version) {
                hash.version = parsedHash.version;
            }
            if (parsedHash.ruleId) {
                hash.ruleId = parsedHash.ruleId;
            }
            var tags = '';
            if (parsedHash.tags) {
                tags = <string>parsedHash.tags;
            }
            hash.tags = tags.split(',');
            var emptyIndex = hash.tags.indexOf('');
            if (emptyIndex >= 0) {
                hash.tags.splice(emptyIndex);
            }
            return hash;
        }
        private static parseHash(input: string): any {
            var hash = input.replace(/^#/, '').split('&'),
                parsed = {};

            for (var i = 0, el; i < hash.length; i++) {
                el = hash[i].split('=')
                parsed[el[0]] = el[1];
            }
            return parsed;
        }
        private changeHash(hash: UrlParams) : string {
            var newHash = 'version=' + hash.version;
            if (hash.ruleId)
            {
                newHash += '&ruleId=' + hash.ruleId;
            }
            if (hash.tags) {
                var tags = '';
                for (var i = 0; i < hash.tags.length; i++) {
                    tags += ',' + hash.tags[i];
                }
                if (tags.length > 1) {
                    tags = tags.substr(1);
                }
                newHash += '&tags=' + tags;
            }

            return newHash;
        }


        currentVersion: string;
        currentRules: Rule[];
        currentDefaultContent: string;
        currentAllTags: TagFrequency[];
        private getContentsForVersion(version: string, callback: Function)
        {
            if (this.currentVersion != version)
            {
                var numberOfCompletedRequests = 0;
                var self = this;
                //load file
                this.getFile('../rules/' + version + '/rules.json', (jsonString) => {
                    self.currentVersion = version;
                    self.currentRules = JSON.parse(jsonString);

                    self.currentAllTags = [];
                    for (var i = 0; i < self.currentRules.length; i++)
                    {
                        var ruleTags = self.currentRules[i].Tags.split(',');
                        for (var tagIndex = 0; tagIndex < ruleTags.length; tagIndex++) {
                            var tag = ruleTags[tagIndex].trim();
                            var found = false;
                            for (var j = 0; j < self.currentAllTags.length; j++) {
                                if (self.currentAllTags[j].Tag == tag) {
                                    self.currentAllTags[j].Count++;
                                    found = true;
                                    break;
                                }
                            }
                            if (!found && tag != '') {
                                self.currentAllTags.push({
                                    Count: 1,
                                    Tag: tag
                                });
                            }
                        }
                    }

                    self.currentAllTags.sort((a, b) => {
                        if (a.Count > b.Count) {
                            return -1;
                        }
                        if (a.Count < b.Count) {
                            return 1;
                        }
                        return 0;
                    });

                    numberOfCompletedRequests++;
                    if (numberOfCompletedRequests == 2) {
                        callback();
                    }
                });
                this.getFile('../rules/' + version + '/index.html', (data) => {
                    self.currentDefaultContent = data;
                    numberOfCompletedRequests++;
                    if (numberOfCompletedRequests == 2) {
                        callback();
                    }
                });
                return;
            }

            callback();
        }
        private getFile(path: string, callback: Function) {
            var self = this;
            this.loadFile(path, (data) => {
                callback(data);
            });
        }
        private loadFile(path: string, callback: Function) {
            var self = this;
            var xobj = new XMLHttpRequest();
            xobj.open('GET', path, true);
            xobj.onload = function () {
                if (this.status == 200) {
                    callback(xobj.responseText);
                }
                else {
                    self.handleVersionError();
                }
            };
            xobj.send(null);
        }
    }
}
