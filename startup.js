function isCompatible(ua) {
    return !!((function() {
        'use strict';
        return !this && Function.prototype.bind && window.JSON;
    }()) && 'querySelector' in document && 'localStorage' in window && 'addEventListener' in window && !ua.match(/MSIE 10|NetFront|Opera Mini|S40OviBrowser|MeeGo|Android.+Glass|^Mozilla\/5\.0 .+ Gecko\/$|googleweblight|PLAYSTATION|PlayStation/));
}
if (!isCompatible(navigator.userAgent)) {
    document.documentElement.className = document.documentElement.className.replace(/(^|\s)client-js(\s|$)/, '$1client-nojs$2');
    while (window.NORLQ && NORLQ[0]) {
        NORLQ.shift()();
    }
    NORLQ = {
        push: function(fn) {
            fn();
        }
    };
    RLQ = {
        push: function() {}
    };
} else {
    if (window.performance && performance.mark) {
        performance.mark('mwStartup');
    }(function() {
        'use strict';
        var mw, StringSet, log, hasOwn = Object.prototype.hasOwnProperty;

        function fnv132(str) {
            var hash = 0x811C9DC5,
                i = 0;
            for (; i < str.length; i++) {
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                hash ^= str.charCodeAt(i);
            }
            hash = (hash >>> 0).toString(36);
            while (hash.length < 7) {
                hash = '0' + hash;
            }
            return hash;
        }

        function defineFallbacks() {
            StringSet = window.Set || function() {
                var set = Object.create(null);
                return {
                    add: function(value) {
                        set[value] = !0;
                    },
                    has: function(value) {
                        return value in set;
                    }
                };
            };
        }

        function setGlobalMapValue(map, key, value) {
            map.values[key] = value;
            log.deprecate(window, key, value, map === mw.config && 'Use mw.config instead.');
        }

        function logError(topic, data) {
            var msg, e = data.exception,
                console = window.console;
            if (console && console.log) {
                msg = (e ? 'Exception' : 'Error') + ' in ' + data.source + (data.module ? ' in module ' + data.module : '') + (e ? ':' : '.');
                console.log(msg);
                if (e && console.warn) {
                    console.warn(e);
                }
            }
        }

        function Map(global) {
            this.values = Object.create(null);
            if (global === true) {
                this.set = function(selection, value) {
                    var s;
                    if (arguments.length > 1) {
                        if (typeof selection === 'string') {
                            setGlobalMapValue(this, selection, value);
                            return true;
                        }
                    } else if (typeof selection === 'object') {
                        for (s in selection) {
                            setGlobalMapValue(this, s, selection[s]);
                        }
                        return true;
                    }
                    return false;
                };
            }
        }
        Map.prototype = {
            constructor: Map,
            get: function(selection, fallback) {
                var
                    results, i;
                fallback = arguments.length > 1 ? fallback : null;
                if (Array.isArray(selection)) {
                    results = {};
                    for (i = 0; i < selection.length; i++) {
                        if (typeof selection[i] === 'string') {
                            results[selection[i]] = selection[i] in this.values ? this.values[selection[i]] : fallback;
                        }
                    }
                    return results;
                }
                if (typeof selection === 'string') {
                    return selection in this.values ? this.values[selection] : fallback;
                }
                if (selection === undefined) {
                    results = {};
                    for (i in this.values) {
                        results[i] = this.values[i];
                    }
                    return results;
                }
                return fallback;
            },
            set: function(selection, value) {
                var s;
                if (arguments.length > 1) {
                    if (typeof selection === 'string') {
                        this.values[selection] = value;
                        return true;
                    }
                } else if (typeof selection === 'object') {
                    for (s in selection) {
                        this.values[s] = selection[s];
                    }
                    return true;
                }
                return false;
            },
            exists: function(selection) {
                var i;
                if (Array.isArray(selection)) {
                    for (i = 0; i < selection.length; i++) {
                        if (typeof selection[i] !== 'string' || !(selection[i] in this.values)) {
                            return false;
                        }
                    }
                    return true;
                }
                return typeof selection === 'string' && selection in this.values;
            }
        };
        defineFallbacks();
        log =
            (function() {
                var log = function() {},
                    console = window.console;
                log.warn = console && console.warn ? Function.prototype.bind.call(console.warn, console) : function() {};
                log.error = console && console.error ? Function.prototype.bind.call(console.error, console) : function() {};
                log.deprecate = function(obj, key, val, msg, logName) {
                    var stacks;

                    function maybeLog() {
                        var name = logName || key,
                            trace = new Error().stack;
                        if (!stacks) {
                            stacks = new StringSet();
                        }
                        if (!stacks.has(trace)) {
                            stacks.add(trace);
                            if (logName || obj === window) {
                                mw.track('mw.deprecate', name);
                            }
                            mw.log.warn('Use of "' + name + '" is deprecated.' + (msg ? ' ' + msg : ''));
                        }
                    }
                    try {
                        Object.defineProperty(obj, key, {
                            configurable: !0,
                            enumerable: !0,
                            get: function() {
                                maybeLog();
                                return val;
                            },
                            set: function(newVal) {
                                maybeLog();
                                val = newVal;
                            }
                        });
                    } catch (err) {
                        obj[key] = val;
                    }
                };
                return log;
            }());
        mw = {
            redefineFallbacksForTest: window.QUnit && defineFallbacks,
            now: function() {
                var perf = window.performance,
                    navStart = perf && perf.timing && perf.timing.navigationStart;
                mw.now = navStart && perf.now ? function() {
                        return navStart + perf.now();
                    } :
                    Date.now;
                return mw.now();
            },
            trackQueue: [],
            track: function(topic, data) {
                mw.trackQueue.push({
                    topic: topic,
                    timeStamp: mw.now(),
                    data: data
                });
            },
            trackError: function(topic, data) {
                mw.track(topic, data);
                logError(topic, data);
            },
            Map: Map,
            config: new Map(true),
            messages: new Map(),
            templates: new Map(),
            log: log,
            loader: (function() {
                var registry = Object.create(null),
                    sources = Object.create(null),
                    handlingPendingRequests = !1,
                    pendingRequests = [],
                    queue = [],
                    jobs = [],
                    willPropagate = !1,
                    errorModules = [],
                    baseModules = ["jquery", "mediawiki.base"],
                    marker = document.querySelector('meta[name="ResourceLoaderDynamicStyles"]'),
                    nextCssBuffer, rAF = window.requestAnimationFrame || setTimeout;

                function newStyleTag(text, nextNode) {
                    var el = document.createElement('style');
                    el.appendChild(document.createTextNode(text));
                    if (nextNode && nextNode.parentNode) {
                        nextNode.parentNode.insertBefore(el, nextNode);
                    } else {
                        document.head.appendChild(el);
                    }
                    return el;
                }

                function flushCssBuffer(cssBuffer) {
                    var i;
                    cssBuffer.active = !1;
                    newStyleTag(cssBuffer.cssText, marker);
                    for (i = 0; i <
                        cssBuffer.callbacks.length; i++) {
                        cssBuffer.callbacks[i]();
                    }
                }

                function addEmbeddedCSS(cssText, callback) {
                    if (!nextCssBuffer || nextCssBuffer.active === false || cssText.slice(0, '@import'.length) === '@import') {
                        nextCssBuffer = {
                            cssText: '',
                            callbacks: [],
                            active: null
                        };
                    }
                    nextCssBuffer.cssText += '\n' + cssText;
                    nextCssBuffer.callbacks.push(callback);
                    if (nextCssBuffer.active === null) {
                        nextCssBuffer.active = !0;
                        rAF(flushCssBuffer.bind(null, nextCssBuffer));
                    }
                }

                function getCombinedVersion(modules) {
                    var hashes = modules.reduce(function(result, module) {
                        return result + registry[module].version;
                    }, '');
                    return fnv132(hashes);
                }

                function allReady(modules) {
                    var i = 0;
                    for (; i < modules.length; i++) {
                        if (mw.loader.getState(modules[i]) !== 'ready') {
                            return false;
                        }
                    }
                    return true;
                }

                function allWithImplicitReady(module) {
                    return allReady(registry[module].dependencies) && (baseModules.indexOf(module) !== -1 || allReady(baseModules));
                }

                function anyFailed(modules) {
                    var state, i = 0;
                    for (; i < modules.length; i++) {
                        state = mw.loader.getState(modules[i]);
                        if (state === 'error' || state ===
                            'missing') {
                            return true;
                        }
                    }
                    return false;
                }

                function doPropagation() {
                    var errorModule, baseModuleError, module, i, failed, job, didPropagate = !0;
                    do {
                        didPropagate = !1;
                        while (errorModules.length) {
                            errorModule = errorModules.shift();
                            baseModuleError = baseModules.indexOf(errorModule) !== -1;
                            for (module in registry) {
                                if (registry[module].state !== 'error' && registry[module].state !== 'missing') {
                                    if (baseModuleError && baseModules.indexOf(module) === -1) {
                                        registry[module].state = 'error';
                                        didPropagate = !0;
                                    } else if (registry[module].dependencies.indexOf(errorModule) !== -1) {
                                        registry[module].state = 'error';
                                        errorModules.push(module);
                                        didPropagate = !0;
                                    }
                                }
                            }
                        }
                        for (module in registry) {
                            if (registry[module].state === 'loaded' && allWithImplicitReady(module)) {
                                execute(module);
                                didPropagate = !0;
                            }
                        }
                        for (i = 0; i < jobs.length; i++) {
                            job = jobs[i];
                            failed = anyFailed(job.dependencies);
                            if (failed || allReady(job.dependencies)) {
                                jobs.splice(i, 1);
                                i -= 1;
                                try {
                                    if (failed && job.error) {
                                        job.error(new Error('Failed dependencies'), job.dependencies);
                                    } else if (!failed && job.ready) {
                                        job.
                                        ready();
                                    }
                                } catch (e) {
                                    mw.trackError('resourceloader.exception', {
                                        exception: e,
                                        source: 'load-callback'
                                    });
                                }
                                didPropagate = !0;
                            }
                        }
                    } while (didPropagate);
                    willPropagate = !1;
                }

                function requestPropagation() {
                    if (willPropagate) {
                        return;
                    }
                    willPropagate = !0;
                    mw.requestIdleCallback(doPropagation, {
                        timeout: 1
                    });
                }

                function setAndPropagate(module, state) {
                    registry[module].state = state;
                    if (state === 'loaded' || state === 'ready' || state === 'error' || state === 'missing') {
                        if (state === 'ready') {
                            mw.loader.store.add(module);
                        } else if (state === 'error' || state === 'missing') {
                            errorModules.push(module);
                        }
                        requestPropagation();
                    }
                }

                function sortDependencies(module, resolved, unresolved) {
                    var i, skip, deps;
                    if (!(module in registry)) {
                        throw new Error('Unknown module: ' + module);
                    }
                    if (typeof registry[module].skip === 'string') {
                        skip = (new Function(registry[module].skip)());
                        registry[module].skip = !!skip;
                        if (skip) {
                            registry[module].dependencies = [];
                            setAndPropagate(module, 'ready');
                            return;
                        }
                    }
                    if (!unresolved) {
                        unresolved = new StringSet();
                    }
                    deps = registry[module].dependencies;
                    unresolved.add(module);
                    for (i = 0; i < deps.length; i++) {
                        if (resolved.indexOf(deps[i]) === -1) {
                            if (unresolved.has(deps[i])) {
                                throw new Error('Circular reference detected: ' + module + ' -> ' + deps[i]);
                            }
                            sortDependencies(deps[i], resolved, unresolved);
                        }
                    }
                    resolved.push(module);
                }

                function resolve(modules) {
                    var resolved = baseModules.slice(),
                        i = 0;
                    for (; i < modules.length; i++) {
                        sortDependencies(modules[i], resolved);
                    }
                    return resolved;
                }

                function resolveStubbornly(modules) {
                    var saved, resolved = baseModules.slice(),
                        i = 0;
                    for (; i < modules.length; i++) {
                        saved = resolved.slice();
                        try {
                            sortDependencies(modules[i], resolved);
                        } catch (err) {
                            resolved = saved;
                            mw.trackError('resourceloader.exception', {
                                exception: err,
                                source: 'resolve'
                            });
                        }
                    }
                    return resolved;
                }

                function resolveRelativePath(relativePath, basePath) {
                    var prefixes, prefix, baseDirParts, relParts = relativePath.match(/^((?:\.\.?\/)+)(.*)$/);
                    if (!relParts) {
                        return null;
                    }
                    baseDirParts = basePath.split('/');
                    baseDirParts.pop();
                    prefixes = relParts[1].split('/');
                    prefixes.pop();
                    while ((prefix = prefixes.pop()) !== undefined) {
                        if (prefix === '..') {
                            baseDirParts.pop();
                        }
                    }
                    return (baseDirParts.length ? baseDirParts.join('/') + '/' : '') + relParts[2];
                }

                function makeRequireFunction(moduleObj, basePath) {
                    return function require(moduleName) {
                        var fileName, fileContent, result, moduleParam, scriptFiles = moduleObj.script.files;
                        fileName = resolveRelativePath(moduleName, basePath);
                        if (fileName === null) {
                            return mw.loader.require(moduleName);
                        }
                        if (!hasOwn.call(scriptFiles, fileName)) {
                            throw new Error('Cannot require undefined file ' + fileName);
                        }
                        if (hasOwn.call(moduleObj.packageExports, fileName)) {
                            return moduleObj.packageExports[fileName];
                        }
                        fileContent = scriptFiles[fileName];
                        if (typeof fileContent === 'function') {
                            moduleParam = {
                                exports: {}
                            };
                            fileContent(makeRequireFunction(moduleObj, fileName), moduleParam);
                            result = moduleParam.exports;
                        } else {
                            result = fileContent;
                        }
                        moduleObj.packageExports[fileName] = result;
                        return result;
                    };
                }

                function addScript(src, callback) {
                    var script = document.createElement('script');
                    script.src = src;
                    script.onload = script.onerror = function() {
                        if (script.parentNode) {
                            script.parentNode.removeChild(script);
                        }
                        if (callback) {
                            callback();
                            callback = null;
                        }
                    };
                    document.head.appendChild(script);
                }

                function queueModuleScript(src, moduleName, callback) {
                    pendingRequests.push(function() {
                        if (moduleName !== 'jquery') {
                            window.require = mw.loader.require;
                            window.module = registry[moduleName].module;
                        }
                        addScript(src, function() {
                            delete window.module;
                            callback();
                            if (pendingRequests[0]) {
                                pendingRequests.shift()();
                            } else {
                                handlingPendingRequests = !1;
                            }
                        });
                    });
                    if (!handlingPendingRequests && pendingRequests[0]) {
                        handlingPendingRequests = !0;
                        pendingRequests.shift()();
                    }
                }

                function addLink(url, media, nextNode) {
                    var el = document.createElement('link');
                    el.rel = 'stylesheet';
                    if (media && media !== 'all') {
                        el.media = media;
                    }
                    el.href = url;
                    if (nextNode && nextNode.parentNode) {
                        nextNode.parentNode.insertBefore(el, nextNode);
                    } else {
                        document.head.appendChild(el);
                    }
                }

                function domEval(code) {
                    var script = document.createElement('script');
                    if (mw.config.get('wgCSPNonce') !== false) {
                        script.nonce = mw.config.get('wgCSPNonce');
                    }
                    script.text = code;
                    document.
                    head.appendChild(script);
                    script.parentNode.removeChild(script);
                }

                function enqueue(dependencies, ready, error) {
                    if (allReady(dependencies)) {
                        if (ready !== undefined) {
                            ready();
                        }
                        return;
                    }
                    if (anyFailed(dependencies)) {
                        if (error !== undefined) {
                            error(new Error('One or more dependencies failed to load'), dependencies);
                        }
                        return;
                    }
                    if (ready !== undefined || error !== undefined) {
                        jobs.push({
                            dependencies: dependencies.filter(function(module) {
                                var state = registry[module].state;
                                return state === 'registered' || state === 'loaded' || state === 'loading' || state === 'executing';
                            }),
                            ready: ready,
                            error: error
                        });
                    }
                    dependencies.forEach(function(module) {
                        if (registry[module].state === 'registered' && queue.indexOf(module) === -1) {
                            queue.push(module);
                        }
                    });
                    mw.loader.work();
                }

                function execute(module) {
                    var key, value, media, i, urls, cssHandle, siteDeps, siteDepErr, runScript, cssPending = 0;
                    if (registry[module].state !== 'loaded') {
                        throw new Error('Module in state "' + registry[module].state + '" may not execute: ' + module);
                    }
                    registry[module].state = 'executing';
                    runScript = function() {
                        var
                            script, markModuleReady, nestedAddScript, mainScript;
                        script = registry[module].script;
                        markModuleReady = function() {
                            setAndPropagate(module, 'ready');
                        };
                        nestedAddScript = function(arr, callback, i) {
                            if (i >= arr.length) {
                                callback();
                                return;
                            }
                            queueModuleScript(arr[i], module, function() {
                                nestedAddScript(arr, callback, i + 1);
                            });
                        };
                        try {
                            if (Array.isArray(script)) {
                                nestedAddScript(script, markModuleReady, 0);
                            } else if (typeof script === 'function' || (typeof script === 'object' && script !== null)) {
                                if (typeof script === 'function') {
                                    if (module === 'jquery') {
                                        script();
                                    } else {
                                        script(window.$, window.$, mw.loader.require, registry[module].module);
                                    }
                                } else {
                                    mainScript = script.files[script.main];
                                    if (typeof mainScript !== 'function') {
                                        throw new Error('Main file in module ' + module + ' must be a function');
                                    }
                                    mainScript(makeRequireFunction(registry[module], script.main), registry[module].module);
                                }
                                markModuleReady();
                            } else if (typeof script === 'string') {
                                domEval(script);
                                markModuleReady();
                            } else {
                                markModuleReady();
                            }
                        } catch (e) {
                            setAndPropagate(module, 'error');
                            mw.trackError(
                                'resourceloader.exception', {
                                    exception: e,
                                    module: module,
                                    source: 'module-execute'
                                });
                        }
                    };
                    if (registry[module].messages) {
                        mw.messages.set(registry[module].messages);
                    }
                    if (registry[module].templates) {
                        mw.templates.set(module, registry[module].templates);
                    }
                    cssHandle = function() {
                        cssPending++;
                        return function() {
                            var runScriptCopy;
                            cssPending--;
                            if (cssPending === 0) {
                                runScriptCopy = runScript;
                                runScript = undefined;
                                runScriptCopy();
                            }
                        };
                    };
                    if (registry[module].style) {
                        for (key in registry[module].style) {
                            value = registry[module].style[key];
                            media = undefined;
                            if (key !== 'url' && key !== 'css') {
                                if (typeof value === 'string') {
                                    addEmbeddedCSS(value, cssHandle());
                                } else {
                                    media = key;
                                    key = 'bc-url';
                                }
                            }
                            if (Array.isArray(value)) {
                                for (i = 0; i < value.length; i++) {
                                    if (key === 'bc-url') {
                                        addLink(value[i], media, marker);
                                    } else if (key === 'css') {
                                        addEmbeddedCSS(value[i], cssHandle());
                                    }
                                }
                            } else if (typeof value === 'object') {
                                for (media in value) {
                                    urls = value[media];
                                    for (i = 0; i < urls.length; i++) {
                                        addLink(urls[i], media, marker);
                                    }
                                }
                            }
                        }
                    }
                    if (module === 'user') {
                        try {
                            siteDeps = resolve(['site']);
                        } catch (e) {
                            siteDepErr = e;
                            runScript();
                        }
                        if (siteDepErr === undefined) {
                            enqueue(siteDeps, runScript, runScript);
                        }
                    } else if (cssPending === 0) {
                        runScript();
                    }
                }

                function sortQuery(o) {
                    var key, sorted = {},
                        a = [];
                    for (key in o) {
                        a.push(key);
                    }
                    a.sort();
                    for (key = 0; key < a.length; key++) {
                        sorted[a[key]] = o[a[key]];
                    }
                    return sorted;
                }

                function buildModulesString(moduleMap) {
                    var p, prefix, str = [],
                        list = [];

                    function restore(suffix) {
                        return p + suffix;
                    }
                    for (prefix in moduleMap) {
                        p = prefix === '' ? '' : prefix + '.';
                        str.push(p + moduleMap[prefix].join(','));
                        list.push.apply(list, moduleMap[prefix].map(restore));
                    }
                    return {
                        str: str.join('|'),
                        list: list
                    };
                }

                function resolveIndexedDependencies(modules) {
                    var i, j, deps;

                    function resolveIndex(dep) {
                        return typeof dep === 'number' ? modules[dep][0] : dep;
                    }
                    for (i = 0; i < modules.length; i++) {
                        deps = modules[i][2];
                        if (deps) {
                            for (j = 0; j < deps.length; j++) {
                                deps[j] = resolveIndex(deps[j]);
                            }
                        }
                    }
                }

                function makeQueryString(params) {
                    return Object.keys(params).map(function(key) {
                        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                    }).join('&');
                }

                function
                batchRequest(batch) {
                    var reqBase, splits, b, bSource, bGroup, source, group, i, modules, sourceLoadScript, currReqBase, currReqBaseLength, moduleMap, currReqModules, l, lastDotIndex, prefix, suffix, bytesAdded;

                    function doRequest() {
                        var query = Object.create(currReqBase),
                            packed = buildModulesString(moduleMap);
                        query.modules = packed.str;
                        query.version = getCombinedVersion(packed.list);
                        query = sortQuery(query);
                        addScript(sourceLoadScript + '?' + makeQueryString(query));
                    }
                    if (!batch.length) {
                        return;
                    }
                    batch.sort();
                    reqBase = {
                        "lang": "en",
                        "skin": "minerva"
                    };
                    splits = Object.create(null);
                    for (b = 0; b < batch.length; b++) {
                        bSource = registry[batch[b]].source;
                        bGroup = registry[batch[b]].group;
                        if (!splits[bSource]) {
                            splits[bSource] = Object.create(null);
                        }
                        if (!splits[bSource][bGroup]) {
                            splits[bSource][bGroup] = [];
                        }
                        splits[bSource][bGroup].push(batch[b]);
                    }
                    for (source in splits) {
                        sourceLoadScript = sources[source];
                        for (group in splits[source]) {
                            modules = splits[source][group];
                            currReqBase = Object.create(reqBase);
                            if (group === 0 && mw.config.get('wgUserName') !== null) {
                                currReqBase
                                    .user = mw.config.get('wgUserName');
                            }
                            currReqBaseLength = makeQueryString(currReqBase).length + 25;
                            l = currReqBaseLength;
                            moduleMap = Object.create(null);
                            currReqModules = [];
                            for (i = 0; i < modules.length; i++) {
                                lastDotIndex = modules[i].lastIndexOf('.');
                                prefix = modules[i].substr(0, lastDotIndex);
                                suffix = modules[i].slice(lastDotIndex + 1);
                                bytesAdded = moduleMap[prefix] ? suffix.length + 3 : modules[i].length + 3;
                                if (currReqModules.length && l + bytesAdded > mw.loader.maxQueryLength) {
                                    doRequest();
                                    l = currReqBaseLength;
                                    moduleMap = Object.create(null);
                                    currReqModules = [];
                                    mw.track('resourceloader.splitRequest', {
                                        maxQueryLength: mw.loader.maxQueryLength
                                    });
                                }
                                if (!moduleMap[prefix]) {
                                    moduleMap[prefix] = [];
                                }
                                l += bytesAdded;
                                moduleMap[prefix].push(suffix);
                                currReqModules.push(modules[i]);
                            }
                            if (currReqModules.length) {
                                doRequest();
                            }
                        }
                    }
                }

                function asyncEval(implementations, cb) {
                    if (!implementations.length) {
                        return;
                    }
                    mw.requestIdleCallback(function() {
                        try {
                            domEval(implementations.join(';'));
                        } catch (err) {
                            cb(err);
                        }
                    });
                }

                function getModuleKey(module) {
                    return module in registry ? (
                        module + '@' + registry[module].version) : null;
                }

                function splitModuleKey(key) {
                    var index = key.indexOf('@');
                    if (index === -1) {
                        return {
                            name: key,
                            version: ''
                        };
                    }
                    return {
                        name: key.slice(0, index),
                        version: key.slice(index + 1)
                    };
                }

                function registerOne(module, version, dependencies, group, source, skip) {
                    if (module in registry) {
                        throw new Error('module already registered: ' + module);
                    }
                    registry[module] = {
                        module: {
                            exports: {}
                        },
                        packageExports: {},
                        version: String(version || ''),
                        dependencies: dependencies || [],
                        group: typeof group === 'undefined' ? null : group,
                        source: typeof source === 'string' ? source : 'local',
                        state: 'registered',
                        skip: typeof skip === 'string' ? skip : null
                    };
                }
                return {
                    moduleRegistry: registry,
                    maxQueryLength: 5000,
                    addStyleTag: newStyleTag,
                    enqueue: enqueue,
                    resolve: resolve,
                    work: function() {
                        var implementations, sourceModules, batch = [],
                            q = 0;
                        for (; q < queue.length; q++) {
                            if (queue[q] in registry && registry[queue[q]].state === 'registered') {
                                if (batch.indexOf(queue[q]) === -1) {
                                    batch.push(queue[q]);
                                    registry[queue[q]].state = 'loading';
                                }
                            }
                        }
                        queue = [];
                        if (!batch.length) {
                            return;
                        }
                        mw.loader.store.init();
                        if (mw.loader.store.enabled) {
                            implementations = [];
                            sourceModules = [];
                            batch = batch.filter(function(module) {
                                var implementation = mw.loader.store.get(module);
                                if (implementation) {
                                    implementations.push(implementation);
                                    sourceModules.push(module);
                                    return false;
                                }
                                return true;
                            });
                            asyncEval(implementations, function(err) {
                                var failed;
                                mw.loader.store.stats.failed++;
                                mw.loader.store.clear();
                                mw.trackError('resourceloader.exception', {
                                    exception: err,
                                    source: 'store-eval'
                                });
                                failed = sourceModules.filter(function(module) {
                                    return registry[module].state === 'loading';
                                });
                                batchRequest(failed);
                            });
                        }
                        batchRequest(batch);
                    },
                    addSource: function(ids) {
                        var id;
                        for (id in ids) {
                            if (id in sources) {
                                throw new Error('source already registered: ' + id);
                            }
                            sources[id] = ids[id];
                        }
                    },
                    register: function(modules) {
                        var i;
                        if (typeof modules === 'object') {
                            resolveIndexedDependencies(modules);
                            for (i = 0; i < modules.length; i++) {
                                registerOne.apply(null, modules[i]);
                            }
                        } else {
                            registerOne.apply(null, arguments);
                        }
                    },
                    implement: function(module, script, style, messages,
                        templates) {
                        var split = splitModuleKey(module),
                            name = split.name,
                            version = split.version;
                        if (!(name in registry)) {
                            mw.loader.register(name);
                        }
                        if (registry[name].script !== undefined) {
                            throw new Error('module already implemented: ' + name);
                        }
                        if (version) {
                            registry[name].version = version;
                        }
                        registry[name].script = script || null;
                        registry[name].style = style || null;
                        registry[name].messages = messages || null;
                        registry[name].templates = templates || null;
                        if (registry[name].state !== 'error' && registry[name].state !== 'missing') {
                            setAndPropagate(name, 'loaded');
                        }
                    },
                    load: function(modules, type) {
                        if (typeof modules === 'string' && /^(https?:)?\/?\//.test(modules)) {
                            if (type === 'text/css') {
                                addLink(modules);
                            } else if (type === 'text/javascript' || type === undefined) {
                                addScript(modules);
                            } else {
                                throw new Error('Invalid type ' + type);
                            }
                        } else {
                            modules = typeof modules === 'string' ? [modules] : modules;
                            enqueue(resolveStubbornly(modules), undefined, undefined);
                        }
                    },
                    state: function(states) {
                        var module, state;
                        for (module in states) {
                            state = states[module];
                            if (!(module in registry)) {
                                mw.
                                loader.register(module);
                            }
                            setAndPropagate(module, state);
                        }
                    },
                    getVersion: function(module) {
                        return module in registry ? registry[module].version : null;
                    },
                    getState: function(module) {
                        return module in registry ? registry[module].state : null;
                    },
                    getModuleNames: function() {
                        return Object.keys(registry);
                    },
                    require: function(moduleName) {
                        var state = mw.loader.getState(moduleName);
                        if (state !== 'ready') {
                            throw new Error('Module "' + moduleName + '" is not loaded');
                        }
                        return registry[moduleName].module.exports;
                    },
                    store: {
                        enabled: null,
                        MODULE_SIZE_MAX: 1e5,
                        items: {},
                        queue: [],
                        stats: {
                            hits: 0,
                            misses: 0,
                            expired: 0,
                            failed: 0
                        },
                        toJSON: function() {
                            return {
                                items: mw.loader.store.items,
                                vary: mw.loader.store.vary,
                                asOf: Math.ceil(Date.now() / 1e7)
                            };
                        },
                        key: "MediaWikiModuleStore:enwiki",
                        vary: "minerva:1-3:en",
                        init: function() {
                            var raw, data;
                            if (this.enabled !== null) {
                                return;
                            }
                            if (!true || /Firefox/.test(navigator.userAgent)) {
                                this.clear();
                                this.enabled = !1;
                                return;
                            }
                            try {
                                raw = localStorage.getItem(this.key);
                                this.enabled = !0;
                                data = JSON.parse(raw);
                                if (data && typeof data.items ===
                                    'object' && data.vary === this.vary && Date.now() < (data.asOf * 1e7) + 259e7) {
                                    this.items = data.items;
                                    return;
                                }
                            } catch (e) {}
                            if (raw === undefined) {
                                this.enabled = !1;
                            }
                        },
                        get: function(module) {
                            var key;
                            if (!this.enabled) {
                                return false;
                            }
                            key = getModuleKey(module);
                            if (key in this.items) {
                                this.stats.hits++;
                                return this.items[key];
                            }
                            this.stats.misses++;
                            return false;
                        },
                        add: function(module) {
                            if (!this.enabled) {
                                return;
                            }
                            this.queue.push(module);
                            this.requestUpdate();
                        },
                        set: function(module) {
                            var key, args, src, encodedScript, descriptor = mw.loader.moduleRegistry[module];
                            key = getModuleKey(module);
                            if (key in this.items || !descriptor || descriptor.state !== 'ready' || !descriptor.version || descriptor.group === 1 || descriptor.group === 0 || [descriptor.script, descriptor.style, descriptor.messages, descriptor.templates].indexOf(undefined) !== -1) {
                                return;
                            }
                            try {
                                if (typeof descriptor.script === 'function') {
                                    encodedScript = String(descriptor.script);
                                } else if (typeof descriptor.script === 'object' && descriptor.script && !Array.isArray(descriptor.script)) {
                                    encodedScript = '{' +
                                        'main:' + JSON.stringify(descriptor.script.main) + ',' + 'files:{' + Object.keys(descriptor.script.files).map(function(key) {
                                            var value = descriptor.script.files[key];
                                            return JSON.stringify(key) + ':' + (typeof value === 'function' ? value : JSON.stringify(value));
                                        }).join(',') + '}}';
                                } else {
                                    encodedScript = JSON.stringify(descriptor.script);
                                }
                                args = [JSON.stringify(key), encodedScript, JSON.stringify(descriptor.style), JSON.stringify(descriptor.messages), JSON.stringify(descriptor.templates)];
                            } catch (e) {
                                mw.trackError('resourceloader.exception', {
                                    exception: e,
                                    source: 'store-localstorage-json'
                                });
                                return;
                            }
                            src = 'mw.loader.implement(' + args.join(',') + ');';
                            if (src.length > this.MODULE_SIZE_MAX) {
                                return;
                            }
                            this.items[key] = src;
                        },
                        prune: function() {
                            var key, module;
                            for (key in this.items) {
                                module = key.slice(0, key.indexOf('@'));
                                if (getModuleKey(module) !== key) {
                                    this.stats.expired++;
                                    delete this.items[key];
                                } else if (this.items[key].length > this.MODULE_SIZE_MAX) {
                                    delete this.items[key];
                                }
                            }
                        },
                        clear: function() {
                            this.items = {};
                            try {
                                localStorage.removeItem(this.key);
                            } catch (e) {}
                        },
                        requestUpdate: (function() {
                            var hasPendingWrites = !1;

                            function flushWrites() {
                                var data, key;
                                mw.loader.store.prune();
                                while (mw.loader.store.queue.length) {
                                    mw.loader.store.set(mw.loader.store.queue.shift());
                                }
                                key = mw.loader.store.key;
                                try {
                                    localStorage.removeItem(key);
                                    data = JSON.stringify(mw.loader.store);
                                    localStorage.setItem(key, data);
                                } catch (e) {
                                    mw.trackError('resourceloader.exception', {
                                        exception: e,
                                        source: 'store-localstorage-update'
                                    });
                                }
                                hasPendingWrites = !1;
                            }

                            function onTimeout() {
                                mw.requestIdleCallback(flushWrites);
                            }
                            return function() {
                                if (!hasPendingWrites) {
                                    hasPendingWrites = !0;
                                    setTimeout(onTimeout, 2000);
                                }
                            };
                        }())
                    }
                };
            }())
        };
        window.mw = window.mediaWiki = mw;
    }());
    (function() {
        var maxBusy = 50;
        mw.requestIdleCallbackInternal = function(callback) {
            setTimeout(function() {
                var start = mw.now();
                callback({
                    didTimeout: !1,
                    timeRemaining: function() {
                        return Math.max(0, maxBusy - (mw.now() - start));
                    }
                });
            }, 1);
        };
        mw.requestIdleCallback = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : mw.
        requestIdleCallbackInternal;
    }());
    (function() {
        mw.loader.addSource({
            "local": "/w/load.php",
            "metawiki": "//meta.wikimedia.org/w/load.php"
        });
        mw.loader.register([
            ["user", "0k1cuul", [], 0],
            ["user.styles", "08fimpv", [], 0],
            ["user.defaults", "02dn5og"],
            ["user.options", "0r5ungb", [2], 1],
            ["user.tokens", "0tffind", [], 1],
            ["mediawiki.skinning.interface", "0kx74h7"],
            ["jquery.makeCollapsible.styles", "0e60s0a"],
            ["mediawiki.skinning.content.parsoid", "1mds3qr"],
            ["jquery", "1nollmt"],
            ["mediawiki.base", "0f03fxc", [8]],
            ["jquery.accessKeyLabel", "1fpzh15", [12, 55]],
            ["jquery.checkboxShiftClick", "18hvfi1"],
            ["jquery.client", "0cwc6tv"],
            ["jquery.cookie", "1fdv0i0"],
            ["jquery.getAttrs", "08wtj2v"],
            ["jquery.highlightText", "0d7z5r5", [55]],
            ["jquery.i18n", "048y7ox", [82]],
            ["jquery.lengthLimit", "0wuhten", [56]],
            ["jquery.makeCollapsible", "0c3ml6j", [6]],
            ["jquery.mw-jump", "0ykc4ya"],
            ["jquery.spinner", "0dtz12w"],
            ["jquery.suggestions", "1jf1rim", [15]],
            ["jquery.tablesorter", "0lvzjsg", [23, 55, 84]],
            ["jquery.tablesorter.styles", "0gq6wtm"],
            [
                "jquery.textSelection", "1fsndek", [12]
            ],
            ["jquery.throttle-debounce", "19vxvii"],
            ["jquery.ui.position", "1ydb457", [], 2],
            ["jquery.ui.widget", "1flaong", [], 2],
            ["moment", "0vukcr7", [55, 80]],
            ["mediawiki.template", "1oeb3iv"],
            ["mediawiki.template.mustache", "1o9pbhg", [29]],
            ["mediawiki.template.regexp", "1h7vja1", [29]],
            ["mediawiki.apipretty", "0effkh8"],
            ["mediawiki.api", "0nli0da", [60, 4]],
            ["mediawiki.content.json", "06v1dsb"],
            ["mediawiki.confirmCloseWindow", "1mz1oy2"],
            ["mediawiki.diff.styles", "09jcmta"],
            ["mediawiki.feedback", "0xawvvq", [49, 154]],
            ["mediawiki.ForeignApi", "11qqfwe", [213]],
            ["mediawiki.ForeignApi.core", "0yld8mp", [33, 142]],
            ["mediawiki.helplink", "061960s"],
            ["mediawiki.hlist", "1v15upv"],
            ["mediawiki.htmlform", "0favr9k", [17, 55]],
            ["mediawiki.htmlform.checker", "0ag62ga", [25]],
            ["mediawiki.htmlform.ooui", "0mg7gmn", [146]],
            ["mediawiki.htmlform.styles", "0p95g88"],
            ["mediawiki.htmlform.ooui.styles", "1s7ye3o"],
            ["mediawiki.icon", "0y7ox3s"],
            ["mediawiki.inspect", "1cu8x0y", [55, 56]],
            ["mediawiki.messagePoster",
                "1pd1y09", [38]
            ],
            ["mediawiki.messagePoster.wikitext", "1enh74d", [49]],
            ["mediawiki.notification", "1a7dxbf", [65, 72]],
            ["mediawiki.notify", "1w9s9af"],
            ["mediawiki.notification.convertmessagebox", "1lw8aw1", [51]],
            ["mediawiki.notification.convertmessagebox.styles", "1vzozl9"],
            ["mediawiki.RegExp", "10ymrcm"],
            ["mediawiki.String", "152v5tv"],
            ["mediawiki.pulsatingdot", "0c57kt0"],
            ["mediawiki.searchSuggest", "12xlx40", [14, 21, 33, 3]],
            ["mediawiki.storage", "1r040mh"],
            ["mediawiki.Title", "0u6msks", [56, 65]],
            ["mediawiki.toc", "0a85isk", [69]],
            ["mediawiki.toc.styles", "06tabgf"],
            ["mediawiki.Uri", "0m5gdom", [65, 31]],
            ["mediawiki.user", "1qvt595", [33, 59, 3]],
            ["mediawiki.util", "192klfe", [10]],
            ["mediawiki.viewport", "0cme4d2"],
            ["mediawiki.checkboxtoggle", "0wxlop5"],
            ["mediawiki.checkboxtoggle.styles", "0le15l8"],
            ["mediawiki.cookie", "1565wnf", [13]],
            ["mediawiki.experiments", "17uc3m9"],
            ["mediawiki.editfont.styles", "166033j"],
            ["mediawiki.visibleTimeout", "10o045a"],
            ["mediawiki.action.edit.styles", "0aig8w2"],
            [
                "mediawiki.action.history", "1toq9r9", [18]
            ],
            ["mediawiki.action.history.styles", "0eqozgb"],
            ["mediawiki.action.view.categoryPage.styles", "1jj6nul"],
            ["mediawiki.action.view.redirect", "0pp2yii", [12]],
            ["mediawiki.action.view.redirectPage", "1b56lmv"],
            ["mediawiki.action.edit.editWarning", "0mb3uri", [24, 35, 83]],
            ["mediawiki.language", "0aytd5t", [81]],
            ["mediawiki.cldr", "00tc5i3", [82]],
            ["mediawiki.libs.pluralruleparser", "0zqfng3"],
            ["mediawiki.jqueryMsg", "1y0xho0", [80, 65, 3]],
            ["mediawiki.language.months", "0s787zz", [80]],
            ["mediawiki.language.names", "0ae35ur", [80]],
            ["mediawiki.language.specialCharacters", "1skm3bf", [80]],
            ["mediawiki.libs.jpegmeta", "1i7en58"],
            ["mediawiki.page.gallery.styles", "16ls4pw"],
            ["mediawiki.page.ready", "1eizokq", [11, 33, 52]],
            ["mediawiki.page.startup", "0aw03it"],
            ["mediawiki.rcfilters.filters.base.styles", "1ttg5aw"],
            ["mediawiki.rcfilters.filters.dm", "1n8gug4", [63, 83, 64, 142]],
            ["mediawiki.rcfilters.filters.ui", "106dprf", [18, 92, 119, 155, 162, 164, 165, 166, 168, 169]],
            [
                "mediawiki.interface.helpers.styles", "0g9bjmp"
            ],
            ["mediawiki.special", "0g0t56u"],
            ["mediawiki.special.apisandbox", "1wxcpa6", [18, 83, 119, 125, 145, 160, 165]],
            ["mediawiki.special.block", "1cjlm3u", [42, 122, 136, 129, 137, 134, 160, 162]],
            ["mediawiki.misc-authed-ooui", "1vxt0zz", [44, 119, 124]],
            ["mediawiki.special.changeslist", "0eee6lm"],
            ["mediawiki.special.changeslist.legend", "1499rcn"],
            ["mediawiki.special.changeslist.legend.js", "1470qvh", [18, 69]],
            ["mediawiki.special.preferences.ooui", "1gz24r0", [35, 71, 53, 59, 129]],
            ["mediawiki.special.preferences.styles.ooui", "1mg4ceh"],
            ["mediawiki.special.recentchanges", "1ja3bj0"],
            ["mediawiki.special.revisionDelete", "0teh80j", [17]],
            ["mediawiki.special.search.commonsInterwikiWidget", "0mry243", [63, 33, 83]],
            ["mediawiki.special.search.interwikiwidget.styles", "0vdelvf"],
            ["mediawiki.special.search.styles", "11wxf4w"],
            ["mediawiki.special.userlogin.common.styles", "13cfklt"],
            ["mediawiki.legacy.shared", "1q7vjvk"],
            ["mediawiki.ui", "1q3d4q0"],
            ["mediawiki.ui.checkbox", "1ho0bm0"],
            [
                "mediawiki.ui.radio", "01guc5i"
            ],
            ["mediawiki.ui.anchor", "06mkbvx"],
            ["mediawiki.ui.button", "1dv63d5"],
            ["mediawiki.ui.input", "1vaq7ll"],
            ["mediawiki.ui.icon", "1osva1r"],
            ["mediawiki.ui.text", "02e1tyo"],
            ["mediawiki.widgets", "08yfjin", [33, 52, 120, 149, 159]],
            ["mediawiki.widgets.styles", "131vqft"],
            ["mediawiki.widgets.AbandonEditDialog", "0z118e2", [154]],
            ["mediawiki.widgets.DateInputWidget", "1qu77x9", [123, 28, 149, 170]],
            ["mediawiki.widgets.DateInputWidget.styles", "19j4qh5"],
            ["mediawiki.widgets.visibleLengthLimit", "067l0ro", [17, 146]],
            ["mediawiki.widgets.datetime", "01dph6e", [55, 146, 169, 170]],
            ["mediawiki.widgets.expiry", "07ex77t", [125, 28, 149]],
            ["mediawiki.widgets.CheckMatrixWidget", "0sxt8rh", [146]],
            ["mediawiki.widgets.CategoryMultiselectWidget", "1p7cc5x", [38, 149]],
            ["mediawiki.widgets.SelectWithInputWidget", "1imc766", [130, 149]],
            ["mediawiki.widgets.SelectWithInputWidget.styles", "1qp3ezx"],
            ["mediawiki.widgets.SizeFilterWidget", "1u5cm8g", [132, 149]],
            ["mediawiki.widgets.SizeFilterWidget.styles", "19ornyi"],
            [
                "mediawiki.widgets.MediaSearch", "0imp2hd", [38, 149]
            ],
            ["mediawiki.widgets.UserInputWidget", "1fhybmx", [33, 149]],
            ["mediawiki.widgets.UsersMultiselectWidget", "1kqrykt", [33, 149]],
            ["mediawiki.widgets.NamespacesMultiselectWidget", "0xc61df", [149]],
            ["mediawiki.widgets.TitlesMultiselectWidget", "0yatzl3", [119]],
            ["mediawiki.widgets.SearchInputWidget.styles", "06fckwv"],
            ["easy-deflate.core", "08cvgzr"],
            ["easy-deflate.deflate", "1sei9bx", [139]],
            ["easy-deflate.inflate", "1sjvif6", [139]],
            ["oojs", "0o5o6ml"],
            ["mediawiki.router", "10tacll", [144]],
            ["oojs-router", "1meh8at", [142]],
            ["oojs-ui", "03m1464", [152, 149, 154]],
            ["oojs-ui-core", "1kwvjei", [80, 142, 148, 147, 156]],
            ["oojs-ui-core.styles", "0dry1u6"],
            ["oojs-ui-core.icons", "0f6un7j"],
            ["oojs-ui-widgets", "1nae43s", [146, 151]],
            ["oojs-ui-widgets.styles", "0klpczn"],
            ["oojs-ui-widgets.icons", "0kil31z"],
            ["oojs-ui-toolbars", "0s1ijp4", [146, 153]],
            ["oojs-ui-toolbars.icons", "0g99294"],
            ["oojs-ui-windows", "1k4h8k3", [146, 155]],
            ["oojs-ui-windows.icons", "0nrb44x"],
            [
                "oojs-ui.styles.indicators", "0t7u753"
            ],
            ["oojs-ui.styles.icons-accessibility", "02lskhn"],
            ["oojs-ui.styles.icons-alerts", "192dnbx"],
            ["oojs-ui.styles.icons-content", "1dtkr3j"],
            ["oojs-ui.styles.icons-editing-advanced", "15e973g"],
            ["oojs-ui.styles.icons-editing-citation", "1c2fe4a"],
            ["oojs-ui.styles.icons-editing-core", "0yhhuf0"],
            ["oojs-ui.styles.icons-editing-list", "1f9jcmr"],
            ["oojs-ui.styles.icons-editing-styling", "1s5s99j"],
            ["oojs-ui.styles.icons-interactions", "113vqmg"],
            ["oojs-ui.styles.icons-layout", "13ftm85"],
            ["oojs-ui.styles.icons-location", "1ehyz23"],
            ["oojs-ui.styles.icons-media", "1yi1rwx"],
            ["oojs-ui.styles.icons-moderation", "13ga98w"],
            ["oojs-ui.styles.icons-movement", "0ojmm9d"],
            ["oojs-ui.styles.icons-user", "0px5qru"],
            ["oojs-ui.styles.icons-wikimedia", "0qc6ol1"],
            ["skins.vector.styles", "1a3btr7"],
            ["skins.vector.styles.responsive", "1wcttkh"],
            ["skins.monobook.responsive", "0r6k07n"],
            ["skins.monobook.mobile", "18an8u2", [65]],
            ["skins.timeless", "1dtus9p"],
            ["skins.timeless.mobile", "0b70vye"],
            [
                "ext.timeline.styles", "1xciodk"
            ],
            ["ext.wikihiero.visualEditor", "15rco2d", [267]],
            ["ext.cite.styles", "0qylh1w"],
            ["ext.cite.style", "0twyxv8"],
            ["ext.inputBox.styles", "1sm8j5i"],
            ["ext.inputBox", "16v4kev", [25]],
            ["ext.pygments", "1r3vnou"],
            ["ext.flaggedRevs.basic", "10xon27"],
            ["ext.flaggedRevs.icons", "1c50auv"],
            ["ext.categoryTree", "0vvnteo", [33]],
            ["ext.categoryTree.styles", "0neo19a"],
            ["ext.spamBlacklist.visualEditor", "1xkkz9h"],
            ["mediawiki.api.titleblacklist", "1t271ha", [33]],
            ["ext.titleblacklist.visualEditor", "1cx81iy"],
            ["ext.tmh.video-js", "1pfodb7"],
            ["ext.tmh.videojs-ogvjs", "0op8pg4", [201, 193]],
            ["ext.tmh.videojs-resolution-switcher", "15by2nm", [193]],
            ["ext.tmh.mw-audio-captions", "0lrzu00", [193]],
            ["ext.tmh.mw-info-button", "0ydpisx", [193, 60]],
            ["ext.tmh.player", "0lzriov", [200, 196, 197, 195]],
            ["ext.tmh.player.styles", "1ojbgtq"],
            ["ext.tmh.OgvJsSupport", "04zk68g"],
            ["ext.tmh.OgvJs", "0thw6y0", [200]],
            ["embedPlayerIframeStyle", "0iaigaw"],
            ["ext.urlShortener.special", "1aghzqu", [63, 44, 119, 145]],
            [
                "ext.score.visualEditor", "1sajcub", [205, 267]
            ],
            ["ext.score.visualEditor.icons", "0c8p3dw"],
            ["ext.cirrus.serp", "1r8yozp", [63]],
            ["ext.confirmEdit.visualEditor", "0dmama7"],
            ["ext.confirmEdit.fancyCaptcha.styles", "0gna49h"],
            ["ext.confirmEdit.fancyCaptcha", "05vxkq2", [33]],
            ["ext.confirmEdit.fancyCaptchaMobile", "05vxkq2", [304]],
            ["ext.centralauth.centralautologin", "0f63rmk", [83, 52]],
            ["ext.centralauth.centralautologin.clearcookie", "0zp4ngx"],
            ["ext.centralauth.ForeignApi", "0ljh2ie", [39]],
            ["ext.widgets.GlobalUserInputWidget", "18oo9qe", [33, 149]],
            ["ext.dismissableSiteNotice", "0myqb3t", [13, 65]],
            ["ext.dismissableSiteNotice.styles", "1u6cc5e"],
            ["ext.centralNotice.startUp", "0cw8q4o", [219]],
            ["ext.centralNotice.geoIP", "1k62gia", [13]],
            ["ext.centralNotice.choiceData", "0xb2fg1", [222, 223, 224, 225]],
            ["ext.centralNotice.display", "0mtrxhx", [218, 221, 63]],
            ["ext.centralNotice.kvStore", "0sgn2qe"],
            ["ext.centralNotice.bannerHistoryLogger", "0y11a6i", [220, 64]],
            ["ext.centralNotice.impressionDiet", "1kxxq34", [220]],
            [
                "ext.centralNotice.largeBannerLimit", "1a2sg8p", [220, 69]
            ],
            ["ext.centralNotice.legacySupport", "0q9ylxz", [220]],
            ["ext.centralNotice.bannerSequence", "13glwwz", [220]],
            ["ext.centralNotice.freegeoipLookup", "1fp3he7", [218]],
            ["ext.centralNotice.bannerController.mobile", "03m1464", [217]],
            ["ext.centralNotice.impressionEventsSampleRate", "00mhd1h", [220]],
            ["ext.collection.bookcreator.messageBox.icons", "1rewkag"],
            ["ext.ElectronPdfService.special.selectionImages", "0c25nf1"],
            ["ext.advancedSearch.searchtoken", "1v7b7kh", [], 1],
            ["ext.abuseFilter.visualEditor", "0dsjmgk"],
            ["ext.betaFeatures", "186mxow", [12]],
            ["ext.betaFeatures.styles", "157s7rm"],
            ["ext.popups.images", "1wwkwgr"],
            ["socket.io", "0310u4f"],
            ["dompurify", "1unooju"],
            ["color-picker", "0iapsvm"],
            ["unicodejs", "1fn8vtl"],
            ["papaparse", "0xmr5ca"],
            ["rangefix", "04s0xvo"],
            ["spark-md5", "027qafu"],
            ["ext.visualEditor.supportCheck", "1iqe78j", [], 3],
            ["ext.visualEditor.sanitize", "0s00goi", [238, 256], 3],
            ["ext.visualEditor.progressBarWidget", "0ocsnhq", [], 3],
            [
                "ext.visualEditor.tempWikitextEditorWidget", "1nt665w", [71, 64], 3
            ],
            ["ext.visualEditor.targetLoader", "15xni9l", [255, 24, 63, 64], 3],
            ["ext.visualEditor.mobileArticleTarget", "1blwmhn", [259, 264], 3],
            ["ext.visualEditor.collabTarget", "033amb2", [257, 263, 165, 166], 3],
            ["ext.visualEditor.collabTarget.mobile", "0106bgq", [250, 264, 268], 3],
            ["ext.visualEditor.collabTarget.init", "1i5hm6x", [244, 119, 145], 3],
            ["ext.visualEditor.collabTarget.init.styles", "0qfh9no", [], 3],
            ["ext.visualEditor.ve", "09udep2", [], 3],
            ["ext.visualEditor.track", "02nvqcg", [254], 3],
            ["ext.visualEditor.base", "0qqlrt4", [254, 145, 240], 3],
            ["ext.visualEditor.mediawiki", "1at0kw4", [256, 248, 401], 3],
            ["ext.visualEditor.mwsave", "1u2gro5", [267, 17, 165], 3],
            ["ext.visualEditor.articleTarget", "04emtde", [268, 258, 121], 3],
            ["ext.visualEditor.data", "0qh7j1r", [257]],
            ["ext.visualEditor.core", "128madb", [256, 244, 12, 241, 242, 243], 3],
            ["ext.visualEditor.commentAnnotation", "020ftov", [261], 3],
            ["ext.visualEditor.rebase", "1qq613w", [239, 277, 262, 245, 171, 237], 3],
            [
                "ext.visualEditor.core.mobile", "1pec09w", [261], 3
            ],
            ["ext.visualEditor.welcome", "0t6tawq", [145], 3],
            ["ext.visualEditor.switching", "1xotm0d", [33, 145, 157, 160, 162], 3],
            ["ext.visualEditor.mwcore", "0465p9o", [278, 257, 490, 266, 265, 13, 36, 94, 83, 57, 7, 119], 3],
            ["ext.visualEditor.mwextensions", "03m1464", [260, 287, 280, 282, 269, 284, 271, 281, 272, 274], 3],
            ["ext.visualEditor.mwformatting", "1nu4ha9", [267], 3],
            ["ext.visualEditor.mwimage.core", "14uqq4s", [267], 3],
            ["ext.visualEditor.mwimage", "1aiw4xa", [270, 133, 28, 168, 172], 3],
            ["ext.visualEditor.mwlink", "0vzr4a4", [267], 3],
            ["ext.visualEditor.mwmeta", "1c4h86v", [272, 78], 3],
            ["ext.visualEditor.mwtransclusion", "08eyni2", [267, 134], 3],
            ["treeDiffer", "1eeh91n"],
            ["diffMatchPatch", "0yy4rti"],
            ["ext.visualEditor.checkList", "15szvpc", [261], 3],
            ["ext.visualEditor.diffing", "0prrux3", [276, 261, 275], 3],
            ["ext.visualEditor.diffLoader", "0qa764q", [248], 3],
            ["ext.visualEditor.language", "15rtg4q", [261, 401, 85], 3],
            ["ext.visualEditor.mwlanguage", "0r8h2wg", [261], 3],
            ["ext.visualEditor.mwalienextension", "0tc6flm", [267], 3],
            ["ext.visualEditor.mwwikitext", "18bayiu", [272, 71], 3],
            ["ext.visualEditor.mwgallery", "1bwfkzf", [267, 88, 133, 168], 3],
            ["ext.visualEditor.mwsignature", "1x4xxn6", [274], 3],
            ["ext.visualEditor.experimental", "03m1464", [], 3],
            ["ext.visualEditor.icons", "03m1464", [288, 289, 158, 159, 160, 162, 163, 164, 165, 166, 169, 170, 171, 156], 3],
            ["ext.visualEditor.moduleIcons", "19tyr87"],
            ["ext.visualEditor.moduleIndicators", "1qvgqz4"],
            ["ext.citoid.visualEditor", "08xvkik", [485, 291]],
            ["ext.citoid.visualEditor.data", "1883rhy", [257]],
            ["ext.templateData.images", "0xw5x4x"],
            ["ext.templateDataGenerator.ui.images", "0g4rzol"],
            ["mobile.pagelist.styles", "0ptlk19"],
            ["mobile.pagesummary.styles", "04z8xwn"],
            ["mobile.startup.images.variants", "06ats9l"],
            ["mobile.messageBox.styles", "05g9509"],
            ["mobile.userpage.icons", "1yohbqo"],
            ["mobile.legacy.icons", "1fn1nn2"],
            ["mobile.userpage.styles", "0dqik00"],
            ["mobile.startup.images", "0gkum3n"],
            ["mobile.init", "0brfoay", [63, 70, 303, 304]],
            ["mobile.init.icons", "1s7x1uf"],
            [
                "mobile.startup", "0l9nr6u", [25, 83, 52, 143, 30, 115, 117, 64, 66, 299, 297, 294, 295, 301, 296]
            ],
            ["mobile.amcOutreachDrawer", "0wd6j5q", [304]],
            ["mobile.editor.overlay", "1f6u01o", [35, 71, 51, 116, 121, 307, 304, 145, 162]],
            ["mobile.editor.images", "0i469b7"],
            ["mobile.talk.overlays", "1oknp9e", [114, 306]],
            ["mobile.mediaViewer", "03yu8ok", [304]],
            ["mobile.categories.overlays", "1u50tr1", [306, 165]],
            ["mobile.languages.structured", "0nvdhxx", [304]],
            ["mobile.nearby.images", "0mma9gu"],
            ["mobile.mainpage.css", "0zfhiy0"],
            ["mobile.site", "1hihcg6", [315]],
            ["mobile.site.styles", "1abadp5"],
            ["mobile.special.styles", "10o0h39"],
            ["mobile.special.user.icons", "0f6maag"],
            ["mobile.special.watchlist.scripts", "1j8ahp4", [304]],
            ["mobile.special.mobilecite.styles", "1tu5bxr"],
            ["mobile.special.mobilemenu.styles", "0awz5jk"],
            ["mobile.special.mobileoptions.styles", "1isxla5"],
            ["mobile.special.mobileoptions.scripts", "0ks3c6t", [304]],
            ["mobile.special.nearby.styles", "0a6jabd"],
            ["mobile.special.userlogin.scripts", "1m9qgo2"],
            [
                "mobile.special.nearby.scripts", "0aulja6", [63, 312, 323, 304]
            ],
            ["mobile.special.history.styles", "091i7m0"],
            ["mobile.special.uploads.scripts", "0o6ws1x", [304]],
            ["mobile.special.uploads.styles", "0cb1suy"],
            ["mobile.special.pagefeed.styles", "106cv5u"],
            ["mobile.special.mobilediff.images", "02lwqdc"],
            ["mobile.special.mobilediff.scripts", "10mhcaj", [330, 304]],
            ["mobile.special.mobilediff.styles", "0mlawrr"],
            ["skins.minerva.base.styles", "07rx7aq"],
            ["skins.minerva.content.styles", "1vkh4m4"],
            ["skins.minerva.content.styles.images", "0ndsnnd"],
            ["skins.minerva.icons.loggedin", "0hc2qdo"],
            ["skins.minerva.amc.styles", "1mmzhkp"],
            ["wikimedia.ui", "1hq2mjv"],
            ["skins.minerva.icons.wikimedia", "0u6yu05"],
            ["skins.minerva.icons.images", "09u28uz"],
            ["skins.minerva.icons.images.scripts", "03m1464", [342, 344, 345, 343]],
            ["skins.minerva.icons.images.scripts.misc", "1vq7puh"],
            ["skins.minerva.icons.page.issues.uncolored", "0zfg068"],
            ["skins.minerva.icons.page.issues.default.color", "19pxgso"],
            [
                "skins.minerva.icons.page.issues.medium.color", "1squc26"
            ],
            ["skins.minerva.mainPage.styles", "1ph8lpb"],
            ["skins.minerva.userpage.icons", "15m6ouu"],
            ["skins.minerva.userpage.styles", "0cuopdk"],
            ["skins.minerva.personalMenu.icons", "0ygsijk"],
            ["skins.minerva.mainMenu.advanced.icons", "00nprcq"],
            ["skins.minerva.mainMenu.icons", "1e70voy"],
            ["skins.minerva.mainMenu.styles", "1co7oxq"],
            ["skins.minerva.loggedin.styles", "0hv0k39"],
            ["skins.minerva.scripts", "1ynb5wg", [13, 63, 70, 114, 304, 341, 339, 351, 352, 338]],
            ["skins.minerva.options.share.icon", "1hk9ko9"],
            ["skins.minerva.options", "1h07ipx", [355, 354]],
            ["skins.minerva.talk", "13uka1l", [354]],
            ["skins.minerva.toggling", "05j1x23", [354]],
            ["skins.minerva.watchstar", "10u0zq2", [354]],
            ["ext.math.styles", "0p6yk4z"],
            ["ext.math.visualEditor", "08v20np", [360, 267]],
            ["ext.math.visualEditor.mathSymbolsData", "0ck829m", [361]],
            ["ext.math.visualEditor.chemSymbolsData", "0ar9ku9", [361]],
            ["ext.babel", "1ya3uag"],
            ["ext.echo.logger", "05idr19", [64, 142]],
            ["ext.echo.ui", "07dmv63", [367,
                365, 494, 52, 149, 158, 159, 165, 169, 170, 171
            ]],
            ["ext.echo.dm", "028iq71", [369, 28]],
            ["ext.echo.api", "1h9wic3", [38]],
            ["ext.echo.init", "0yjudo6", [368, 63, 83]],
            ["ext.echo.styles.badge", "1f5qdor"],
            ["ext.echo.styles.notifications", "1birhfz"],
            ["ext.echo.styles.alert", "0291lwp"],
            ["ext.echo.special", "0b6sa0p", [374, 366]],
            ["ext.echo.styles.special", "0y1gjkm"],
            ["ext.thanks.images", "13657j0"],
            ["ext.thanks.mobilediff", "0qa4jf9", [375, 33, 83, 52]],
            ["ext.disambiguator.visualEditor", "086u4q3", [273]],
            ["ext.codeEditor.icons", "0zhr8vk"],
            ["ext.relatedArticles.cards", "1vafjnd", [380, 65, 142]],
            ["ext.relatedArticles.lib", "1lq2uvz"],
            ["ext.relatedArticles.readMore.gateway", "00vbs1t", [142]],
            ["ext.relatedArticles.readMore.bootstrap", "0ychxqy", [381, 25, 63, 70, 64, 66]],
            ["ext.relatedArticles.readMore", "0t5g92j", [65]],
            ["ext.RevisionSlider.dialogImages", "1bjx2fu"],
            ["ext.TwoColConflict.Split.TourImages", "1dfytnm"],
            ["ext.eventLogging", "1qxckkx", [64]],
            ["ext.eventLogging.debug", "00zjxgk"],
            ["ext.wikimediaEvents", "0905391", [386, 63, 70]],
            [
                "ext.wikimediaEvents.loggedin", "09yjdr5", [63, 64]
            ],
            ["ext.wikimediaEvents.wikibase", "0m1obgu"],
            ["ext.navigationTiming", "1s7ja55", [386, 13]],
            ["ext.navigationTiming.rumSpeedIndex", "18q6uui"],
            ["ext.uls.common", "0xfad9b", [401, 69, 64]],
            ["ext.uls.i18n", "0ryuue2", [16, 65]],
            ["ext.uls.languagenames", "10lnk7b"],
            ["ext.uls.mediawiki", "0dafykl", [393, 395, 397, 400]],
            ["ext.uls.messages", "0p09o3q", [394]],
            ["ext.uls.webfonts.mobile", "1i4t8e6", [399, 403]],
            ["ext.uls.webfonts.repository", "0rs3wly"],
            ["jquery.uls", "1x6f006", [16, 401, 402]],
            ["jquery.uls.data", "0usp2fc"],
            ["jquery.uls.grid", "14gmvov"],
            ["jquery.webfonts", "09oya9z"],
            ["ext.cx.model", "04mmy0z"],
            ["ext.cx.feedback", "17klrdp", [404]],
            ["ext.cx.dashboard", "06qkfc1", [405, 421, 410, 414, 423, 426, 168]],
            ["ext.cx.util", "0s2wxm7", [404]],
            ["mw.cx.util", "1ewhpna", [404, 64]],
            ["ext.cx.sitemapper", "08yyhmq", [404, 38, 63, 69, 64]],
            ["mw.cx.SourcePageSelector", "1emu91q", [411, 431]],
            ["mw.cx.SelectedSourcePage", "1oxvumi", [417, 21, 412, 160]],
            ["mw.cx.ui.LanguageFilter", "13ml73y", [396, 83, 115, 422, 408, 165]],
            ["ext.cx.progressbar", "08e8s05", [83]],
            ["mw.cx.dashboard.lists", "0cql3ls", [413, 407, 419, 119, 28, 412, 162, 169]],
            ["ext.cx.stats", "1sgs0w8", [416, 409, 407, 420, 419, 401, 83, 28, 423]],
            ["chart.js", "1mzybda"],
            ["ext.cx.tools.validator", "0xwydvx", [409]],
            ["ext.cx.widgets.overlay", "0k84vy4", [404]],
            ["ext.cx.widgets.spinner", "01evoyt", [404]],
            ["ext.cx.widgets.callout", "190buue"],
            ["ext.cx.widgets.translator", "0grcx95", [404, 33, 80]],
            ["mw.cx.ui", "0lnc6ew", [404, 145]],
            ["mw.cx.ui.Header", "1hor4mf", [432, 171, 172]],
            ["mw.cx.ui.Header.legacy", "0xx4m84", [426, 432, 171, 172]],
            ["mw.cx.ui.Header.skin", "0gyyr9n"],
            ["mw.cx.ui.Infobar", "18fqite", [430, 408]],
            ["mw.cx.ui.CaptchaDialog", "0qhonpg", [496, 422]],
            ["mw.cx.ui.LoginDialog", "178m7pb", [65, 422]],
            ["mw.cx.ui.PublishSettingsWidget", "1n9lts4", [422, 165]],
            ["mw.cx.ui.MessageWidget", "130xvhi", [422, 158, 165]],
            ["mw.cx.ui.PageSelectorWidget", "0ub2k5a", [409, 401, 433, 165]],
            ["mw.cx.ui.PersonalMenuWidget", "1txrebw", [64, 119, 422]],
            ["mw.cx.ui.TitleOptionWidget", "17r3ocx", [119, 422]],
            [
                "mw.cx.ui.FeatureDiscoveryWidget", "13jcb0t", [57, 422]
            ],
            ["mw.externalguidance.init", "1fgk895", [63]],
            ["mw.externalguidance", "13ah9bm", [38, 304, 437, 162]],
            ["mw.externalguidance.icons", "099il4a"],
            ["mw.externalguidance.special", "0555707", [401, 38, 113, 304, 437]],
            ["ext.graph.styles", "1lq2vv6"],
            ["ext.graph.data", "0lnpu6i"],
            ["ext.graph.loader", "08172kq", [33]],
            ["ext.graph.vega1", "1m2sqmm", [440, 63]],
            ["ext.graph.vega2", "01qjrzr", [440, 63]],
            ["ext.graph.visualEditor", "0v8ryih", [440, 270]],
            ["ext.ores.highlighter", "1sjet05"],
            ["ext.ores.styles", "1hlikt4"],
            ["ext.ores.specialoresmodels.styles", "0hw0rhx"],
            ["ext.quicksurveys.views", "1bpzrzt", [449, 63, 149]],
            ["ext.quicksurveys.lib", "0lq9sbt", [69, 70, 64, 66]],
            ["ext.quicksurveys.init", "0whcbmy", [449]],
            ["ext.kartographer", "1dc4652"],
            ["ext.kartographer.extlinks", "04pzke3"],
            ["ext.kartographer.style", "1vr45x8"],
            ["ext.kartographer.site", "1jxypm8"],
            ["mapbox", "05srhhh"],
            ["leaflet.draw", "0u1yuee", [455]],
            ["ext.kartographer.link", "17n506q", [459, 143]],
            ["ext.kartographer.box",
                "0vf06ky", [460, 471, 454, 453, 463, 25, 63, 33, 168]
            ],
            ["ext.kartographer.linkbox", "0dcx08a", [463]],
            ["ext.kartographer.data", "1j9o28i"],
            ["ext.kartographer.dialog", "1r6daua", [143, 154, 159]],
            ["ext.kartographer.dialog.sidebar", "0ap5hk0", [452, 165, 170]],
            ["ext.kartographer.util", "0l19yep", [451]],
            ["ext.kartographer.frame", "0bgmn5u", [458, 143]],
            ["ext.kartographer.staticframe", "16nwv7k", [459, 143, 168]],
            ["ext.kartographer.preview", "1yz42o8"],
            ["ext.kartographer.editing", "0a5a6e6", [33]],
            ["ext.kartographer.editor", "03m1464", [458, 456]],
            ["ext.kartographer.visualEditor", "1qn3g27", [463, 267, 25, 167]],
            ["ext.kartographer.lib.prunecluster", "0f3p92q", [455]],
            ["ext.kartographer.lib.topojson", "01b1b9h", [455]],
            ["ext.kartographer.wv", "17qgukv", [470, 162]],
            ["ext.kartographer.specialMap", "05cvhgv"],
            ["mw.config.values.wbRepo", "1vusrwy"],
            ["wikibase", "0vbcn0a"],
            ["wikibase.api.RepoApi", "0ro5g9g"],
            ["wikibase.api.RepoApiError", "1vilhko", [481]],
            ["wikibase.api.getLocationAgnosticMwApi", "16854kv", [38]],
            ["vue2", "1t4qsv5"],
            [
                "util.ContentLanguages", "179sske", [481]
            ],
            ["util.inherit", "1px7tzk"],
            ["skins.monobook.mobile.echohack", "1fm8o58", [65, 158]],
            ["ext.cite.visualEditor.core", "0drpilr", [267]],
            ["ext.cite.visualEditor.data", "1w4rwbr", [257]],
            ["ext.cite.visualEditor", "1uye59i", [182, 181, 483, 484, 274, 158, 161, 165]],
            ["ext.geshi.visualEditor", "0rtoahi", [267]],
            ["ext.gadget.switcher", "0g3anh6", [], 4],
            ["ext.gadget.MobileCategories", "1e5kt2j", [33], 4],
            ["ext.gadget.MobileMaps", "09tp59c", [], 4],
            ["ext.visualEditor.mwextensionmessages", "1kc8his"],
            ["mobile.notifications.overlay", "18w99cp", [366, 304, 145]],
            ["mobile.editor.ve", "139guju", [249, 306]],
            ["ext.echo.emailicons", "0t7wl44"],
            ["ext.echo.secondaryicons", "1o71w4i"],
            ["ext.wikimediaEvents.visualEditor", "0b57n61", [248]],
            ["mw.cx.externalmessages", "038r8ye"],
            ["ext.quicksurveys.survey.perceived-performance-survey", "08wwz68"]
        ]);
        mw.config.set({
            "debug": !1,
            "skin": "minerva",
            "stylepath": "/w/skins",
            "wgUrlProtocols": "bitcoin\\:|ftp\\:\\/\\/|ftps\\:\\/\\/|geo\\:|git\\:\\/\\/|gopher\\:\\/\\/|http\\:\\/\\/|https\\:\\/\\/|irc\\:\\/\\/|ircs\\:\\/\\/|magnet\\:|mailto\\:|mms\\:\\/\\/|news\\:|nntp\\:\\/\\/|redis\\:\\/\\/|sftp\\:\\/\\/|sip\\:|sips\\:|sms\\:|ssh\\:\\/\\/|svn\\:\\/\\/|tel\\:|telnet\\:\\/\\/|urn\\:|worldwind\\:\\/\\/|xmpp\\:|\\/\\/",
            "wgArticlePath": "/wiki/$1",
            "wgScriptPath": "/w",
            "wgScript": "/w/index.php",
            "wgSearchType": "CirrusSearch",
            "wgVariantArticlePath": !1,
            "wgActionPaths": {},
            "wgServer": "//en.wikipedia.org",
            "wgServerName": "en.wikipedia.org",
            "wgUserLanguage": "en",
            "wgContentLanguage": "en",
            "wgTranslateNumerals": !0,
            "wgVersion": "1.34.0-wmf.21",
            "wgEnableAPI": !0,
            "wgEnableWriteAPI": !0,
            "wgFormattedNamespaces": {
                "-2": "Media",
                "-1": "Special",
                "0": "",
                "1": "Talk",
                "2": "User",
                "3": "User talk",
                "4": "Wikipedia",
                "5": "Wikipedia talk",
                "6": "File",
                "7": "File talk",
                "8": "MediaWiki",
                "9": "MediaWiki talk",
                "10": "Template",
                "11": "Template talk",
                "12": "Help",
                "13": "Help talk",
                "14": "Category",
                "15": "Category talk",
                "100": "Portal",
                "101": "Portal talk",
                "108": "Book",
                "109": "Book talk",
                "118": "Draft",
                "119": "Draft talk",
                "446": "Education Program",
                "447": "Education Program talk",
                "710": "TimedText",
                "711": "TimedText talk",
                "828": "Module",
                "829": "Module talk",
                "2300": "Gadget",
                "2301": "Gadget talk",
                "2302": "Gadget definition",
                "2303": "Gadget definition talk"
            },
            "wgNamespaceIds": {
                "media": -2,
                "special": -1,
                "": 0,
                "talk": 1,
                "user": 2,
                "user_talk": 3,
                "wikipedia": 4,
                "wikipedia_talk": 5,
                "file": 6,
                "file_talk": 7,
                "mediawiki": 8,
                "mediawiki_talk": 9,
                "template": 10,
                "template_talk": 11,
                "help": 12,
                "help_talk": 13,
                "category": 14,
                "category_talk": 15,
                "portal": 100,
                "portal_talk": 101,
                "book": 108,
                "book_talk": 109,
                "draft": 118,
                "draft_talk": 119,
                "education_program": 446,
                "education_program_talk": 447,
                "timedtext": 710,
                "timedtext_talk": 711,
                "module": 828,
                "module_talk": 829,
                "gadget": 2300,
                "gadget_talk": 2301,
                "gadget_definition": 2302,
                "gadget_definition_talk": 2303,
                "wp": 4,
                "wt": 5,
                "image": 6,
                "image_talk": 7,
                "project": 4,
                "project_talk": 5
            },
            "wgContentNamespaces": [0],
            "wgSiteName": "Wikipedia",
            "wgDBname": "enwiki",
            "wgExtraSignatureNamespaces": [4, 12],
            "wgExtensionAssetsPath": "/w/extensions",
            "wgCookiePrefix": "enwiki",
            "wgCookieDomain": "",
            "wgCookiePath": "/",
            "wgCookieExpiration": 2592000,
            "wgCaseSensitiveNamespaces": [2302, 2303],
            "wgLegalTitleChars": " %!\"$\u0026'()*,\\-./0-9:;=?@A-Z\\\\\\^_`a-z~+\\u0080-\\uFFFF",
            "wgIllegalFileChars": ":/\\\\",
            "wgForeignUploadTargets": ["shared"],
            "wgEnableUploads": !0,
            "wgCommentByteLimit": null,
            "wgCommentCodePointLimit": 500,
            "wgCiteVisualEditorOtherGroup": !1,
            "wgCiteResponsiveReferences": !0,
            "wgTimedMediaHandler": {
                "MediaWiki.DefaultProvider": "local",
                "MediaWiki.ApiProviders": {
                    "wikimediacommons": {
                        "url": "//commons.wikimedia.org/w/api.php"
                    }
                },
                "EmbedPlayer.OverlayControls": !0,
                "EmbedPlayer.CodecPreference": ["vp9", "webm", "h264", "ogg", "mp3", "ogvjs"],
                "EmbedPlayer.DisableVideoTagSupport": !1,
                "EmbedPlayer.DisableHTML5FlashFallback": !0,
                "EmbedPlayer.ReplaceSources": null,
                "EmbedPlayer.EnableFlavorSelector": !1,
                "EmbedPlayer.EnableIpadHTMLControls": !0,
                "EmbedPlayer.WebKitPlaysInline": !1,
                "EmbedPlayer.EnableIpadNativeFullscreen": !1,
                "EmbedPlayer.iPhoneShowHTMLPlayScreen": !0,
                "EmbedPlayer.ForceLargeReplayButton": !1,
                "EmbedPlayer.RewriteSelector": "video,audio,playlist",
                "EmbedPlayer.DefaultSize": "400x300",
                "EmbedPlayer.ControlsHeight": 31,
                "EmbedPlayer.TimeDisplayWidth": 85,
                "EmbedPlayer.KalturaAttribution": !0,
                "EmbedPlayer.EnableOptionsMenu": !0,
                "EmbedPlayer.EnableRightClick": !0,
                "EmbedPlayer.EnabledOptionsMenuItems": ["playerSelect", "download", "share", "aboutPlayerLibrary"],
                "EmbedPlayer.WaitForMeta": !0,
                "EmbedPlayer.ShowNativeWarning": !0,
                "EmbedPlayer.ShowPlayerAlerts": !0,
                "EmbedPlayer.EnableFullscreen": !0,
                "EmbedPlayer.EnableTimeDisplay": !0,
                "EmbedPlayer.EnableVolumeControl": !0,
                "EmbedPlayer.NewWindowFullscreen": !1,
                "EmbedPlayer.FullscreenTip": !0,
                "EmbedPlayer.DirectFileLinkWarning": !0,
                "EmbedPlayer.NativeControls": !1,
                "EmbedPlayer.NativeControlsMobileSafari": !0,
                "EmbedPlayer.FullScreenZIndex": 999998,
                "EmbedPlayer.ShareEmbedMode": "iframe",
                "EmbedPlayer.MonitorRate": 250,
                "EmbedPlayer.UseFlashOnAndroid": !1,
                "EmbedPlayer.EnableURLTimeEncoding": "flash",
                "EmbedPLayer.IFramePlayer.DomainWhiteList": "*",
                "EmbedPlayer.EnableIframeApi": !0,
                "EmbedPlayer.PageDomainIframe": !0,
                "EmbedPlayer.NotPlayableDownloadLink": !0,
                "TimedText.ShowInterface": "always",
                "TimedText.ShowAddTextLink": !0,
                "TimedText.ShowRequestTranscript": !1,
                "TimedText.NeedsTranscriptCategory": "Videos needing subtitles",
                "TimedText.BottomPadding": 10,
                "TimedText.BelowVideoBlackBoxHeight": 40
            },
            "wgCirrusSearchFeedbackLink": !1,
            "wgMultimediaViewer": {
                "infoLink": "https://mediawiki.org/wiki/Special:MyLanguage/Extension:Media_Viewer/About",
                "discussionLink": "https://mediawiki.org/wiki/Special:MyLanguage/Extension_talk:Media_Viewer/About",
                "helpLink": "https://mediawiki.org/wiki/Special:MyLanguage/Help:Extension:Media_Viewer",
                "useThumbnailGuessing": !0,
                "durationSamplingFactor": 1000,
                "durationSamplingFactorLoggedin": !1,
                "networkPerformanceSamplingFactor": 1000,
                "actionLoggingSamplingFactorMap": {
                    "default": 10,
                    "close": 4000,
                    "defullscreen": 45,
                    "download": 40,
                    "download-close": 240,
                    "download-open": 320,
                    "embed-select-menu-html-original": 30,
                    "enlarge": 40,
                    "file-description-page-abovefold": 30,
                    "fullscreen": 80,
                    "hash-load": 400,
                    "history-navigation": 1600,
                    "image-view": 10000,
                    "metadata-close": 160,
                    "metadata-open": 70,
                    "metadata-scroll-close": 535,
                    "metadata-scroll-open": 645,
                    "next-image": 2500,
                    "prev-image": 1000,
                    "right-click-image": 340,
                    "thumbnail": 5000,
                    "view-original-file": 523
                },
                "attributionSamplingFactor": 1000,
                "dimensionSamplingFactor": 1000,
                "imageQueryParameter": !1,
                "recordVirtualViewBeaconURI": "/beacon/media",
                "tooltipDelay": 1000,
                "extensions": {
                    "jpg": "default",
                    "jpeg": "default",
                    "gif": "default",
                    "svg": "default",
                    "png": "default",
                    "tiff": "default",
                    "tif": "default",
                    "stl": "mmv.3d"
                }
            },
            "wgMediaViewer": !0,
            "wgPopupsVirtualPageViews": !0,
            "wgPopupsGateway": "restbaseHTML",
            "wgPopupsEventLogging": !1,
            "wgPopupsRestGatewayEndpoint": "/api/rest_v1/page/summary/",
            "wgPopupsStatsvSamplingRate": 0.01,
            "wgVisualEditorConfig": {
                "usePageImages": !0,
                "usePageDescriptions": !0,
                "disableForAnons": !0,
                "preloadModules": ["site", "user"],
                "preferenceModules": {
                    "visualeditor-enable-experimental": "ext.visualEditor.experimental"
                },
                "namespaces": [100, 108, 118, 2, 6, 12, 14, 0],
                "contentModels": {
                    "wikitext": "article"
                },
                "pluginModules": ["ext.wikihiero.visualEditor", "ext.cite.visualEditor", "ext.geshi.visualEditor", "ext.spamBlacklist.visualEditor", "ext.titleblacklist.visualEditor", "ext.score.visualEditor", "ext.confirmEdit.visualEditor", "ext.CodeMirror.visualEditor.init", "ext.CodeMirror.visualEditor", "ext.templateDataGenerator.editPage", "ext.math.visualEditor", "ext.disambiguator.visualEditor", "ext.wikimediaEvents.visualEditor", "ext.graph.visualEditor", "ext.kartographer.editing", "ext.kartographer.visualEditor", "ext.abuseFilter.visualEditor", "ext.citoid.visualEditor"],
                "thumbLimits": [120, 150, 180, 200, 220, 250, 300, 400],
                "galleryOptions": {
                    "imagesPerRow": 0,
                    "imageWidth": 120,
                    "imageHeight": 120,
                    "captionLength": !0,
                    "showBytes": !0,
                    "mode": "traditional",
                    "showDimensions": !0
                },
                "blacklist": {
                    "firefox": [
                        ["\u003C=", 11]
                    ],
                    "safari": [
                        ["\u003C=", 6]
                    ],
                    "opera": [
                        ["\u003C", 12]
                    ]
                },
                "tabPosition": "before",
                "tabMessages": {
                    "edit": null,
                    "editsource": "visualeditor-ca-editsource",
                    "create": null,
                    "createsource": "visualeditor-ca-createsource",
                    "editlocaldescription": "edit-local",
                    "editlocaldescriptionsource": "visualeditor-ca-editlocaldescriptionsource",
                    "createlocaldescription": "create-local",
                    "createlocaldescriptionsource": "visualeditor-ca-createlocaldescriptionsource",
                    "editsection": "editsection",
                    "editsectionsource": "visualeditor-ca-editsource-section"
                },
                "singleEditTab": !0,
                "enableVisualSectionEditing": "mobile",
                "showBetaWelcome": !0,
                "allowExternalLinkPaste": !1,
                "enableTocWidget": !1,
                "enableWikitext": !0,
                "svgMaxSize": 4096,
                "namespacesWithSubpages": {
                    "8": 0,
                    "1": !0,
                    "2": !0,
                    "3": !0,
                    "4": !0,
                    "5": !0,
                    "7": !0,
                    "9": !0,
                    "10": !0,
                    "11": !0,
                    "12": !0,
                    "13": !0,
                    "14": !0,
                    "15":
                        !0,
                    "100": !0,
                    "101": !0,
                    "102": !0,
                    "103": !0,
                    "104": !0,
                    "105": !0,
                    "106": !0,
                    "107": !0,
                    "108": !0,
                    "109": !0,
                    "110": !0,
                    "111": !0,
                    "112": !0,
                    "113": !0,
                    "114": !0,
                    "115": !0,
                    "116": !0,
                    "117": !0,
                    "118": !0,
                    "119": !0,
                    "447": !0,
                    "830": !0,
                    "831": !0,
                    "828": !0,
                    "829": !0
                },
                "specialBooksources": "Special:BookSources",
                "rebaserUrl": !1,
                "restbaseUrl": "/api/rest_v1/page/html/",
                "fullRestbaseUrl": "/api/rest_",
                "allowLossySwitching": !1,
                "feedbackApiUrl": !1,
                "feedbackTitle": !1,
                "sourceFeedbackTitle": !1
            },
            "wgCitoidConfig": {
                "citoidServiceUrl": !1,
                "fullRestbaseUrl": !1,
                "wbFullRestbaseUrl": !1
            },
            "wgGuidedTourHelpGuiderUrl": "Help:Guided tours/guider",
            "wgMinervaABSamplingRate": 0,
            "wgMinervaCountErrors": !0,
            "wgMinervaErrorLogSamplingRate": 0,
            "wgMinervaReadOnly": !1,
            "pageTriageNamespaces": [0, 2, 118],
            "wgPageTriageDraftNamespaceId": 118,
            "wgGettingStartedConfig": {
                "hasCategories": !0
            },
            "wgRelatedArticlesCardLimit": 3,
            "wgEventLoggingSchemaApiUri": "https://meta.wikimedia.org/w/api.php",
            "wgEventLoggingSchemaRevision": {
                "CentralNoticeBannerHistory": 19079897,
                "MediaViewer": 10867062,
                "MultimediaViewerNetworkPerformance": 15573630,
                "MultimediaViewerDuration": 10427980,
                "MultimediaViewerAttribution": 9758179,
                "MultimediaViewerDimensions": 10014238,
                "Popups": 17807993,
                "VirtualPageView": 17780078,
                "GuidedTourGuiderImpression": 8694395,
                "GuidedTourGuiderHidden": 8690549,
                "GuidedTourButtonClick": 13869649,
                "GuidedTourInternalLinkActivation": 8690553,
                "GuidedTourExternalLinkActivation": 8690560,
                "GuidedTourExited": 8690566,
                "MobileWebSearch": 12054448,
                "WebClientError": 18340282,
                "MobileWebShareButton": 18923688,
                "GettingStartedRedirectImpression": 7355552,
                "SignupExpCTAButtonClick": 8965028,
                "SignupExpCTAImpression": 8965023,
                "SignupExpPageLinkClick": 8965014,
                "TaskRecommendation": 9266319,
                "TaskRecommendationClick": 9266317,
                "TaskRecommendationImpression": 9266226,
                "TaskRecommendationLightbulbClick": 9433256,
                "TwoColConflictConflict": 18155295,
                "Print": 17630514,
                "ReadingDepth": 18201205,
                "EditAttemptStep": 19154569,
                "VisualEditorFeatureUse": 18457512,
                "CompletionSuggestions": 13630018,
                "SearchSatisfaction": 19240639,
                "TestSearchSatisfaction2": 19250889,
                "SearchSatisfactionErrors": 17181648,
                "Search": 14361785,
                "ChangesListHighlights": 16484288,
                "ChangesListFilterGrouping": 17008168,
                "RecentChangesTopLinks": 16732249,
                "InputDeviceDynamics": 17687647,
                "MobileWebUIActionsTracking": 19230467,
                "CitationUsage": 18810892,
                "CitationUsagePageLoad": 18502712,
                "WMDEBannerEvents": 18437830,
                "WMDEBannerSizeIssue": 18193993,
                "WikidataCompletionSearchClicks": 18665070,
                "UserFeedback": 18903446,
                "UniversalLanguageSelector": 17799034,
                "ContentTranslation": 18999884,
                "ContentTranslationCTA": 16017678,
                "ContentTranslationAbuseFilter": 18472730,
                "ContentTranslationSuggestion": 19004928,
                "ContentTranslationError": 11767097,
                "QuickSurveysResponses": 18397510,
                "QuickSurveyInitiation": 18397507,
                "AdvancedSearchRequest": 18227136,
                "ArticleCreationWorkflow": 17145434,
                "TemplateWizard": 18374327,
                "EchoInteraction": 15823738,
                "NavigationTiming": 19157653,
                "SaveTiming": 15396492,
                "ResourceTiming": 18358918,
                "CentralNoticeTiming": 18418286,
                "CpuBenchmark": 18436118,
                "ServerTiming": 18622171,
                "RUMSpeedIndex": 18813781,
                "PaintTiming": 19000009,
                "ElementTiming": 19315761,
                "LayoutJank": 18935150,
                "FeaturePolicyViolation": 19120697,
                "ExternalGuidance": 18903973
            },
            "wgWMEStatsdBaseUri": "/beacon/statsv",
            "wgWMEReadingDepthSamplingRate": 0.005,
            "wgWMEReadingDepthEnabled": !1,
            "wgWMEPrintSamplingRate": 0,
            "wgWMEPrintEnabled": !0,
            "wgWMECitationUsagePopulationSize": 0,
            "wgWMECitationUsagePageLoadPopulationSize": 0,
            "wgWMESchemaEditAttemptStepSamplingRate": "0.0625",
            "wgWMEWikidataCompletionSearchClicks": [],
            "wgWMEPhp7SamplingRate": 2,
            "wgWMEMobileWebUIActionsTracking": 0.1,
            "wgULSIMEEnabled": !1,
            "wgULSWebfontsEnabled": !1,
            "wgULSPosition": "interlanguage",
            "wgULSAnonCanChangeLanguage": !1,
            "wgULSEventLogging": !0,
            "wgULSImeSelectors": ["input:not([type])", "input[type=text]", "input[type=search]", "textarea", "[contenteditable]"],
            "wgULSNoImeSelectors": ["#wpCaptchaWord", ".ve-ce-surface-paste",
                ".ve-ce-surface-readOnly [contenteditable]", ".ace_editor textarea"
            ],
            "wgULSNoWebfontsSelectors": ["#p-lang li.interlanguage-link \u003E a"],
            "wgULSFontRepositoryBasePath": "/w/extensions/UniversalLanguageSelector/data/fontrepo/fonts/",
            "wgContentTranslationTranslateInTarget": !0,
            "wgContentTranslationDomainCodeMapping": {
                "be-tarask": "be-x-old",
                "bho": "bh",
                "crh-latn": "crh",
                "gsw": "als",
                "lzh": "zh-classical",
                "nan": "zh-min-nan",
                "nb": "no",
                "rup": "roa-rup",
                "sgs": "bat-smg",
                "simple": "simple",
                "vro": "fiu-vro",
                "yue": "zh-yue"
            },
            "wgContentTranslationSiteTemplates": {
                "view": "//$1.wikipedia.org/wiki/$2",
                "action": "//$1.wikipedia.org/w/index.php?title=$2",
                "api": "//$1.wikipedia.org/w/api.php",
                "cx": "//cxserver.wikimedia.org/v1",
                "cookieDomain": null,
                "restbase": "//$1.wikipedia.org/api/rest_v1"
            },
            "wgContentTranslationTargetNamespace": 0,
            "wgExternalGuidanceMTReferrers": ["translate.google.com", "translate.googleusercontent.com"],
            "wgExternalGuidanceSiteTemplates": {
                "view": "//$1.wikipedia.org/wiki/$2",
                "action": "//$1.wikipedia.org/w/index.php?title=$2",
                "api": "//$1.wikipedia.org/w/api.php"
            },
            "wgExternalGuidanceDomainCodeMapping": {
                "be-tarask": "be-x-old",
                "bho": "bh",
                "crh-latn": "crh",
                "gsw": "als",
                "lzh": "zh-classical",
                "nan": "zh-min-nan",
                "nb": "no",
                "rup": "roa-rup",
                "sgs": "bat-smg",
                "vro": "fiu-vro",
                "yue": "zh-yue"
            },
            "wgEnabledQuickSurveys": [{
                "audience": [],
                "name": "perceived-performance-survey",
                "question": "ext-quicksurveys-performance-internal-survey-question",
                "description": null,
                "module": "ext.quicksurveys.survey.perceived-performance-survey",
                "coverage": 0,
                "platforms": {
                    "desktop": ["stable"]
                },
                "privacyPolicy": "ext-quicksurveys-performance-internal-survey-privacy-policy",
                "type": "internal",
                "answers": ["ext-quicksurveys-example-internal-survey-answer-positive", "ext-quicksurveys-example-internal-survey-answer-neutral", "ext-quicksurveys-example-internal-survey-answer-negative"],
                "shuffleAnswersDisplay": !0,
                "freeformTextLabel": null
            }],
            "wgCentralNoticeActiveBannerDispatcher": "//meta.wikimedia.org/w/index.php?title=Special:BannerLoader",
            "wgCentralSelectedBannerDispatcher": "//meta.wikimedia.org/w/index.php?title=Special:BannerLoader",
            "wgCentralBannerRecorder": "//en.m.wikipedia.org/beacon/impression",
            "wgCentralNoticeSampleRate": 0.01,
            "wgCentralNoticeImpressionEventSampleRate": 0.01,
            "wgNoticeNumberOfBuckets": 4,
            "wgNoticeBucketExpiry": 7,
            "wgNoticeNumberOfControllerBuckets": 2,
            "wgNoticeCookieDurations": {
                "close": 604800,
                "donate": 21600000
            },
            "wgNoticeHideUrls": ["//en.wikipedia.org/w/index.php?title=Special:HideBanners", "//meta.wikimedia.org/w/index.php?title=Special:HideBanners", "//commons.wikimedia.org/w/index.php?title=Special:HideBanners", "//species.wikimedia.org/w/index.php?title=Special:HideBanners", "//en.wikibooks.org/w/index.php?title=Special:HideBanners", "//en.wikiquote.org/w/index.php?title=Special:HideBanners", "//en.wikisource.org/w/index.php?title=Special:HideBanners", "//en.wikinews.org/w/index.php?title=Special:HideBanners",
                "//en.wikiversity.org/w/index.php?title=Special:HideBanners", "//www.mediawiki.org/w/index.php?title=Special:HideBanners"
            ],
            "wgCentralNoticePerCampaignBucketExtension": 30
        });
        mw.config.set(window.RLCONF || {});
        mw.loader.state(window.RLSTATE || {});
        mw.loader.load(window.RLPAGEMODULES || []);
        RLQ = window.RLQ || [];
        RLQ.push = function(fn) {
            if (typeof fn === 'function') {
                fn();
            } else {
                RLQ[RLQ.length] = fn;
            }
        };
        while (RLQ[0]) {
            RLQ.push(RLQ.shift());
        }
        NORLQ = {
            push: function() {}
        };
    }());
}
