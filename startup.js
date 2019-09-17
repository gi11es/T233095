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
            hash = (hash >>> 0).toString(36).slice(0, 5);
            while (hash.length < 5) {
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
            get: function(selection,
                fallback) {
                var results, i;
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
        log = (function() {
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
                    return navStart +
                        perf.now();
                } : Date.now;
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
                    newStyleTag(cssBuffer.cssText,
                        marker);
                    for (i = 0; i < cssBuffer.callbacks.length; i++) {
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
                        if (state ===
                            'error' || state === 'missing') {
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
                                    } else if (!failed &&
                                        job.ready) {
                                        job.ready();
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
                    deps = registry[module].
                    dependencies;
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
                    while ((prefix = prefixes.pop()) !==
                        undefined) {
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
                        if (
                            script.parentNode) {
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
                    script.
                    text = code;
                    document.head.appendChild(script);
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
                        var script, markModuleReady, nestedAddScript, mainScript;
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
                            setAndPropagate(module,
                                'error');
                            mw.trackError('resourceloader.exception', {
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
                            siteDeps =
                                resolve(['site']);
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

                function batchRequest(batch) {
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
                            if (group === 0 && mw.config.get(
                                    'wgUserName') !== null) {
                                currReqBase.user = mw.config.get('wgUserName');
                            }
                            currReqBaseLength = makeQueryString(currReqBase).length + 23;
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

                function getModuleKey(
                    module) {
                    return module in registry ? (module + '@' + registry[module].version) : null;
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
                    implement: function(module, script, style, messages, templates) {
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
                            state = states[
                                module];
                            if (!(module in registry)) {
                                mw.loader.register(module);
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
                                data = JSON.
                                parse(raw);
                                if (data && typeof data.items === 'object' && data.vary === this.vary && Date.now() < (data.asOf * 1e7) + 259e7) {
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
                                } else if (typeof descriptor.script === 'object' && descriptor.script && !Array.isArray(
                                        descriptor.script)) {
                                    encodedScript = '{' + 'main:' + JSON.stringify(descriptor.script.main) + ',' + 'files:{' + Object.keys(descriptor.script.files).map(function(key) {
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
        mw.requestIdleCallback = window.requestIdleCallback ? window.
        requestIdleCallback.bind(window): mw.requestIdleCallbackInternal;
    }());
    (function() {
        mw.loader.addSource({
            "local": "/w/load.php",
            "metawiki": "//meta.wikimedia.org/w/load.php"
        });
        mw.loader.register([
            ["user", "k1cuu", [], 0],
            ["user.styles", "8fimp", [], 0],
            ["user.defaults", "1etoc"],
            ["user.options", "r5ung", [2], 1],
            ["user.tokens", "tffin", [], 1],
            ["mediawiki.skinning.interface", "kx74h"],
            ["jquery.makeCollapsible.styles", "e60s0"],
            ["mediawiki.skinning.content.parsoid", "1mds3"],
            ["jquery", "1noll"],
            ["mediawiki.base", "f03fx", [8]],
            ["jquery.accessKeyLabel", "3m146", [65]],
            ["jquery.checkboxShiftClick", "18hvf"],
            ["jquery.client", "cwc6t"],
            ["jquery.cookie", "1fdv0"],
            ["jquery.getAttrs", "8wtj2"],
            ["jquery.highlightText", "57m83", [65]],
            ["jquery.i18n", "48y7o", [82]],
            ["jquery.lengthLimit", "wuhte", [56]],
            ["jquery.makeCollapsible", "c3ml6", [6]],
            ["jquery.mw-jump", "ykc4y"],
            ["jquery.spinner", "dtz12"],
            ["jquery.suggestions", "1jf1r", [15]],
            ["jquery.tablesorter", "1q9mq", [23, 84, 65]],
            ["jquery.tablesorter.styles", "gq6wt"],
            ["jquery.textSelection", "1fsnd", [12]],
            ["jquery.throttle-debounce", "19vxv"],
            ["jquery.ui.position", "1ydb4", [], 2],
            ["jquery.ui.widget", "1flao", [], 2],
            ["moment", "2s2op", [80, 65]],
            ["mediawiki.template", "1oeb3"],
            ["mediawiki.template.mustache", "1o9pb", [29]],
            ["mediawiki.template.regexp", "1h7vj", [29]],
            ["mediawiki.apipretty", "effkh"],
            ["mediawiki.api", "nli0d", [60, 4]],
            ["mediawiki.content.json", "6v1ds"],
            ["mediawiki.confirmCloseWindow", "1mz1o"],
            ["mediawiki.diff.styles", "9jcmt"],
            ["mediawiki.feedback", "xawvv", [49, 154]],
            ["mediawiki.ForeignApi", "11qqf", [213]],
            ["mediawiki.ForeignApi.core", "yld8m", [33, 142]],
            ["mediawiki.helplink", "61960"],
            ["mediawiki.hlist", "1v15u"],
            ["mediawiki.htmlform", "x0sc4", [17, 65]],
            ["mediawiki.htmlform.checker", "14y2t"],
            ["mediawiki.htmlform.ooui", "mg7gm", [146]],
            ["mediawiki.htmlform.styles", "p95g8"],
            ["mediawiki.htmlform.ooui.styles", "1s7ye"],
            ["mediawiki.icon", "y7ox3"],
            ["mediawiki.inspect", "akok9", [56, 65]],
            ["mediawiki.messagePoster", "1pd1y", [38]],
            ["mediawiki.messagePoster.wikitext", "1enh7", [49]],
            [
                "mediawiki.notification", "1a7dx", [65, 72]
            ],
            ["mediawiki.notify", "1w9s9"],
            ["mediawiki.notification.convertmessagebox", "1lw8a", [51]],
            ["mediawiki.notification.convertmessagebox.styles", "1vzoz"],
            ["mediawiki.RegExp", "3m146", [65]],
            ["mediawiki.String", "152v5"],
            ["mediawiki.pulsatingdot", "c57kt"],
            ["mediawiki.searchSuggest", "12xlx", [14, 21, 33, 3]],
            ["mediawiki.storage", "1r040"],
            ["mediawiki.Title", "1u3kg", [56, 65]],
            ["mediawiki.toc", "a85is", [69]],
            ["mediawiki.toc.styles", "6tabg"],
            ["mediawiki.Uri", "m5gdo", [65, 31]],
            ["mediawiki.user", "1qvt5", [33, 59, 3]],
            ["mediawiki.util", "dzgg8", [12]],
            ["mediawiki.viewport", "cme4d"],
            ["mediawiki.checkboxtoggle", "wxlop"],
            ["mediawiki.checkboxtoggle.styles", "le15l"],
            ["mediawiki.cookie", "1565w", [13]],
            ["mediawiki.experiments", "17uc3"],
            ["mediawiki.editfont.styles", "16603"],
            ["mediawiki.visibleTimeout", "10o04"],
            ["mediawiki.action.edit.styles", "aig8w"],
            ["mediawiki.action.history", "1toq9", [18]],
            ["mediawiki.action.history.styles", "eqozg"],
            ["mediawiki.action.view.categoryPage.styles",
                "1jj6n"
            ],
            ["mediawiki.action.view.redirect", "pp2yi", [12]],
            ["mediawiki.action.view.redirectPage", "1b56l"],
            ["mediawiki.action.edit.editWarning", "mb3ur", [24, 35, 83]],
            ["mediawiki.language", "aytd5", [81]],
            ["mediawiki.cldr", "tc5i3", [82]],
            ["mediawiki.libs.pluralruleparser", "zqfng"],
            ["mediawiki.jqueryMsg", "1y0xh", [80, 65, 3]],
            ["mediawiki.language.months", "s787z", [80]],
            ["mediawiki.language.names", "1cb18", [80]],
            ["mediawiki.language.specialCharacters", "1skm3", [80]],
            ["mediawiki.libs.jpegmeta", "1i7en"],
            ["mediawiki.page.gallery.styles", "16ls4"],
            ["mediawiki.page.ready", "1eizo", [11, 33, 52]],
            ["mediawiki.page.startup", "aw03i"],
            ["mediawiki.rcfilters.filters.base.styles", "1ttg5"],
            ["mediawiki.rcfilters.filters.dm", "n3af8", [63, 83, 64, 142]],
            ["mediawiki.rcfilters.filters.ui", "15cmp", [18, 92, 119, 155, 162, 164, 165, 166, 168, 169]],
            ["mediawiki.interface.helpers.styles", "g9bjm"],
            ["mediawiki.special", "g0t56"],
            ["mediawiki.special.apisandbox", "1wxcp", [18, 83, 119, 125, 145, 160, 165]],
            ["mediawiki.special.block", "1cjlm", [42, 122, 136, 129, 137, 134, 160, 162]],
            ["mediawiki.misc-authed-ooui", "1vxt0", [44, 119, 124]],
            ["mediawiki.special.changeslist", "gtdgm"],
            ["mediawiki.special.changeslist.legend", "1499r"],
            ["mediawiki.special.changeslist.legend.js", "1470q", [18, 69]],
            ["mediawiki.special.preferences.ooui", "1gz24", [35, 71, 53, 59, 129]],
            ["mediawiki.special.preferences.styles.ooui", "1mg4c"],
            ["mediawiki.special.recentchanges", "1ja3b"],
            ["mediawiki.special.revisionDelete", "teh80", [17]],
            ["mediawiki.special.search.commonsInterwikiWidget", "mry24", [63, 33, 83]],
            ["mediawiki.special.search.interwikiwidget.styles", "vdelv"],
            ["mediawiki.special.search.styles", "11wxf"],
            ["mediawiki.special.userlogin.common.styles", "13cfk"],
            ["mediawiki.legacy.shared", "1q7vj"],
            ["mediawiki.ui", "1q3d4"],
            ["mediawiki.ui.checkbox", "1ho0b"],
            ["mediawiki.ui.radio", "1guc5"],
            ["mediawiki.ui.anchor", "6mkbv"],
            ["mediawiki.ui.button", "1dv63"],
            ["mediawiki.ui.input", "1vaq7"],
            ["mediawiki.ui.icon", "1osva"],
            ["mediawiki.ui.text", "2e1ty"],
            ["mediawiki.widgets", "8yfji", [33, 52, 120, 149, 159]],
            [
                "mediawiki.widgets.styles", "131vq"
            ],
            ["mediawiki.widgets.AbandonEditDialog", "z118e", [154]],
            ["mediawiki.widgets.DateInputWidget", "1qu77", [123, 28, 149, 170]],
            ["mediawiki.widgets.DateInputWidget.styles", "19j4q"],
            ["mediawiki.widgets.visibleLengthLimit", "67l0r", [17, 146]],
            ["mediawiki.widgets.datetime", "1o0gr", [65, 146, 169, 170]],
            ["mediawiki.widgets.expiry", "7ex77", [125, 28, 149]],
            ["mediawiki.widgets.CheckMatrixWidget", "sxt8r", [146]],
            ["mediawiki.widgets.CategoryMultiselectWidget", "1p7cc", [38, 149]],
            ["mediawiki.widgets.SelectWithInputWidget", "1imc7", [130, 149]],
            ["mediawiki.widgets.SelectWithInputWidget.styles", "1qp3e"],
            ["mediawiki.widgets.SizeFilterWidget", "1u5cm", [132, 149]],
            ["mediawiki.widgets.SizeFilterWidget.styles", "19orn"],
            ["mediawiki.widgets.MediaSearch", "imp2h", [38, 149]],
            ["mediawiki.widgets.UserInputWidget", "1fhyb", [33, 149]],
            ["mediawiki.widgets.UsersMultiselectWidget", "1kqry", [33, 149]],
            ["mediawiki.widgets.NamespacesMultiselectWidget", "xc61d", [149]],
            ["mediawiki.widgets.TitlesMultiselectWidget",
                "yatzl", [119]
            ],
            ["mediawiki.widgets.SearchInputWidget.styles", "6fckw"],
            ["easy-deflate.core", "8cvgz"],
            ["easy-deflate.deflate", "1sei9", [139]],
            ["easy-deflate.inflate", "1sjvi", [139]],
            ["oojs", "1czp8"],
            ["mediawiki.router", "10tac", [144]],
            ["oojs-router", "1meh8", [142]],
            ["oojs-ui", "3m146", [152, 149, 154]],
            ["oojs-ui-core", "19hif", [80, 142, 148, 147, 156]],
            ["oojs-ui-core.styles", "1yqku"],
            ["oojs-ui-core.icons", "19x55"],
            ["oojs-ui-widgets", "wha9f", [146, 151]],
            ["oojs-ui-widgets.styles", "ewbhb"],
            ["oojs-ui-widgets.icons", "12l9u"],
            ["oojs-ui-toolbars", "1x1tb", [146, 153]],
            ["oojs-ui-toolbars.icons", "1qrhi"],
            ["oojs-ui-windows", "1ljtz", [146, 155]],
            ["oojs-ui-windows.icons", "1gwju"],
            ["oojs-ui.styles.indicators", "hjxf3"],
            ["oojs-ui.styles.icons-accessibility", "rdtqi"],
            ["oojs-ui.styles.icons-alerts", "u2vt3"],
            ["oojs-ui.styles.icons-content", "14n7f"],
            ["oojs-ui.styles.icons-editing-advanced", "11aa4"],
            ["oojs-ui.styles.icons-editing-citation", "101fd"],
            ["oojs-ui.styles.icons-editing-core", "ksulu"],
            [
                "oojs-ui.styles.icons-editing-list", "1k52x"
            ],
            ["oojs-ui.styles.icons-editing-styling", "zbgix"],
            ["oojs-ui.styles.icons-interactions", "1ls8a"],
            ["oojs-ui.styles.icons-layout", "1o1k5"],
            ["oojs-ui.styles.icons-location", "pq3ka"],
            ["oojs-ui.styles.icons-media", "kpqdu"],
            ["oojs-ui.styles.icons-moderation", "1kt37"],
            ["oojs-ui.styles.icons-movement", "11hq6"],
            ["oojs-ui.styles.icons-user", "1ld75"],
            ["oojs-ui.styles.icons-wikimedia", "n98u4"],
            ["skins.vector.styles", "1a3bt"],
            ["skins.vector.styles.responsive", "1wctt"],
            ["skins.monobook.responsive", "r6k07"],
            ["skins.monobook.mobile", "18an8", [65]],
            ["skins.timeless", "1dtus"],
            ["skins.timeless.mobile", "b70vy"],
            ["ext.timeline.styles", "1xcio"],
            ["ext.wikihiero.visualEditor", "15rco", [267]],
            ["ext.cite.styles", "qylh1"],
            ["ext.cite.style", "twyxv"],
            ["ext.inputBox.styles", "1sm8j"],
            ["ext.inputBox", "16v4k", [25]],
            ["ext.pygments", "1r3vn"],
            ["ext.flaggedRevs.basic", "10xon"],
            ["ext.flaggedRevs.icons", "1qdks"],
            ["ext.categoryTree", "vvnte", [33]],
            ["ext.categoryTree.styles", "neo19"],
            [
                "ext.spamBlacklist.visualEditor", "1xkkz"
            ],
            ["mediawiki.api.titleblacklist", "1t271", [33]],
            ["ext.titleblacklist.visualEditor", "1cx81"],
            ["ext.tmh.video-js", "1pfod"],
            ["ext.tmh.videojs-ogvjs", "op8pg", [201, 193]],
            ["ext.tmh.videojs-resolution-switcher", "15by2", [193]],
            ["ext.tmh.mw-audio-captions", "lrzu0", [193]],
            ["ext.tmh.mw-info-button", "ydpis", [193, 60]],
            ["ext.tmh.player", "lzrio", [200, 196, 197, 195]],
            ["ext.tmh.player.styles", "1ojbg"],
            ["ext.tmh.OgvJsSupport", "4zk68"],
            ["ext.tmh.OgvJs", "thw6y", [200]],
            ["embedPlayerIframeStyle", "iaiga"],
            ["ext.urlShortener.special", "1aghz", [63, 44, 119, 145]],
            ["ext.score.visualEditor", "1sajc", [205, 267]],
            ["ext.score.visualEditor.icons", "rig2b"],
            ["ext.cirrus.serp", "1r8yo", [63]],
            ["ext.confirmEdit.visualEditor", "dmama"],
            ["ext.confirmEdit.fancyCaptcha.styles", "gna49"],
            ["ext.confirmEdit.fancyCaptcha", "5vxkq", [33]],
            ["ext.confirmEdit.fancyCaptchaMobile", "5vxkq", [303]],
            ["ext.centralauth.centralautologin", "f63rm", [83, 52]],
            ["ext.centralauth.centralautologin.clearcookie", "zp4ng"],
            [
                "ext.centralauth.ForeignApi", "ljh2i", [39]
            ],
            ["ext.widgets.GlobalUserInputWidget", "18oo9", [33, 149]],
            ["ext.dismissableSiteNotice", "myqb3", [13, 65]],
            ["ext.dismissableSiteNotice.styles", "1u6cc"],
            ["ext.centralNotice.startUp", "cw8q4", [219]],
            ["ext.centralNotice.geoIP", "1k62g", [13]],
            ["ext.centralNotice.choiceData", "xb2fg", [222, 223, 224, 225]],
            ["ext.centralNotice.display", "149pu", [218, 221, 384, 63]],
            ["ext.centralNotice.kvStore", "sgn2q"],
            ["ext.centralNotice.bannerHistoryLogger", "1bwdc", [220]],
            ["ext.centralNotice.impressionDiet", "1kxxq", [220]],
            ["ext.centralNotice.largeBannerLimit", "1a2sg", [220, 69]],
            ["ext.centralNotice.legacySupport", "q9ylx", [220]],
            ["ext.centralNotice.bannerSequence", "13glw", [220]],
            ["ext.centralNotice.freegeoipLookup", "1fp3h", [218]],
            ["ext.centralNotice.bannerController.mobile", "3m146", [217]],
            ["ext.centralNotice.impressionEventsSampleRate", "mhd1h", [220]],
            ["ext.collection.bookcreator.messageBox.icons", "1gz63"],
            ["ext.ElectronPdfService.special.selectionImages", "3jsgu"],
            [
                "ext.advancedSearch.searchtoken", "1v7b7", [], 1
            ],
            ["ext.abuseFilter.visualEditor", "dsjmg"],
            ["ext.betaFeatures", "186mx", [12]],
            ["ext.betaFeatures.styles", "157s7"],
            ["ext.popups.images", "w8s6o"],
            ["socket.io", "310u4"],
            ["dompurify", "1unoo"],
            ["color-picker", "iapsv"],
            ["unicodejs", "1fn8v"],
            ["papaparse", "xmr5c"],
            ["rangefix", "4s0xv"],
            ["spark-md5", "27qaf"],
            ["ext.visualEditor.supportCheck", "1iqe7", [], 3],
            ["ext.visualEditor.sanitize", "s00go", [238, 256], 3],
            ["ext.visualEditor.progressBarWidget", "ocsnh", [], 3],
            ["ext.visualEditor.tempWikitextEditorWidget", "1nt66", [71, 64], 3],
            ["ext.visualEditor.targetLoader", "15xni", [255, 24, 63, 64], 3],
            ["ext.visualEditor.mobileArticleTarget", "1xeqg", [259, 264], 3],
            ["ext.visualEditor.collabTarget", "33amb", [257, 263, 165, 166], 3],
            ["ext.visualEditor.collabTarget.mobile", "1a6uq", [250, 264, 268], 3],
            ["ext.visualEditor.collabTarget.init", "1i5hm", [244, 119, 145], 3],
            ["ext.visualEditor.collabTarget.init.styles", "qfh9n", [], 3],
            ["ext.visualEditor.ve", "9udep", [], 3],
            ["ext.visualEditor.track", "2nvqc", [
                254
            ], 3],
            ["ext.visualEditor.base", "1j9lf", [254, 145, 240], 3],
            ["ext.visualEditor.mediawiki", "1at0k", [256, 248, 399], 3],
            ["ext.visualEditor.mwsave", "1u2gr", [267, 17, 165], 3],
            ["ext.visualEditor.articleTarget", "12ntv", [268, 258, 121], 3],
            ["ext.visualEditor.data", "qh7j1", [257]],
            ["ext.visualEditor.core", "uxb4b", [256, 244, 12, 241, 242, 243], 3],
            ["ext.visualEditor.commentAnnotation", "20fto", [261], 3],
            ["ext.visualEditor.rebase", "1qq61", [239, 277, 262, 245, 171, 237], 3],
            ["ext.visualEditor.core.mobile", "1pec0", [261], 3],
            ["ext.visualEditor.welcome", "t6taw", [145], 3],
            ["ext.visualEditor.switching", "1xotm", [33, 145, 157, 160, 162], 3],
            ["ext.visualEditor.mwcore", "465p9", [278, 257, 488, 266, 265, 13, 36, 94, 83, 57, 7, 119], 3],
            ["ext.visualEditor.mwextensions", "3m146", [260, 287, 280, 282, 269, 284, 271, 281, 272, 274], 3],
            ["ext.visualEditor.mwformatting", "1nu4h", [267], 3],
            ["ext.visualEditor.mwimage.core", "14uqq", [267], 3],
            ["ext.visualEditor.mwimage", "1aiw4", [270, 133, 28, 168, 172], 3],
            ["ext.visualEditor.mwlink", "1k5vd", [267], 3],
            ["ext.visualEditor.mwmeta",
                "1c4h8", [272, 78], 3
            ],
            ["ext.visualEditor.mwtransclusion", "8eyni", [267, 134], 3],
            ["treeDiffer", "1eeh9"],
            ["diffMatchPatch", "yy4rt"],
            ["ext.visualEditor.checkList", "15szv", [261], 3],
            ["ext.visualEditor.diffing", "prrux", [276, 261, 275], 3],
            ["ext.visualEditor.diffLoader", "qa764", [248], 3],
            ["ext.visualEditor.language", "15rtg", [261, 399, 85], 3],
            ["ext.visualEditor.mwlanguage", "r8h2w", [261], 3],
            ["ext.visualEditor.mwalienextension", "tc6fl", [267], 3],
            ["ext.visualEditor.mwwikitext", "xmurt", [272, 71], 3],
            ["ext.visualEditor.mwgallery", "1bwfk", [267, 88, 133, 168], 3],
            ["ext.visualEditor.mwsignature", "1x4xx", [274], 3],
            ["ext.visualEditor.experimental", "3m146", [], 3],
            ["ext.visualEditor.icons", "3m146", [288, 289, 158, 159, 160, 162, 163, 164, 165, 166, 169, 170, 171, 156], 3],
            ["ext.visualEditor.moduleIcons", "agmdc"],
            ["ext.visualEditor.moduleIndicators", "oixzb"],
            ["ext.citoid.visualEditor", "8xvki", [483, 291]],
            ["ext.citoid.visualEditor.data", "1883r", [257]],
            ["ext.templateData.images", "46tqj"],
            ["ext.templateDataGenerator.ui.images", "bbrsm"],
            [
                "mobile.pagelist.styles", "ptlk1"
            ],
            ["mobile.pagesummary.styles", "4z8xw"],
            ["mobile.messageBox.styles", "v9s22"],
            ["mobile.placeholder.images", "g4m73"],
            ["mobile.userpage.styles", "vf06s"],
            ["mobile.startup.images", "19sfe"],
            ["mobile.init.styles", "y1eei"],
            ["mobile.init", "1o02c", [63, 70, 303]],
            ["mobile.ooui.icons", "1fb1m"],
            ["mobile.startup", "8tguk", [25, 83, 52, 143, 30, 115, 117, 64, 66, 296, 302, 294, 295, 297, 299]],
            ["mobile.amcOutreachDrawer", "xiv8h", [303]],
            ["mobile.editor.overlay", "j04sn", [35, 71, 51, 116, 121, 306, 303, 145, 162]],
            ["mobile.editor.images", "x48pm"],
            ["mobile.talk.overlays", "1oknp", [114, 305]],
            ["mobile.mediaViewer", "3yu8o", [303]],
            ["mobile.categories.overlays", "1u50t", [305, 165]],
            ["mobile.languages.structured", "nvdhx", [303]],
            ["mobile.mainpage.css", "zfhiy"],
            ["mobile.site", "1hihc", [313]],
            ["mobile.site.styles", "1abad"],
            ["mobile.special.styles", "139tw"],
            ["mobile.special.user.icons", "hkcix"],
            ["mobile.special.watchlist.scripts", "1j8ah", [303]],
            ["mobile.special.mobilecite.styles", "1tu5b"],
            [
                "mobile.special.mobilemenu.styles", "awz5j"
            ],
            ["mobile.special.mobileoptions.styles", "1isxl"],
            ["mobile.special.mobileoptions.scripts", "ks3c6", [303]],
            ["mobile.special.nearby.styles", "en3ku"],
            ["mobile.special.userlogin.scripts", "1m9qg"],
            ["mobile.special.nearby.scripts", "aulja", [63, 321, 303]],
            ["mobile.special.history.styles", "91i7m"],
            ["mobile.special.uploads.scripts", "o6ws1", [303]],
            ["mobile.special.uploads.styles", "cb1su"],
            ["mobile.special.pagefeed.styles", "106cv"],
            ["mobile.special.mobilediff.images", "dybvp"],
            ["mobile.special.mobilediff.scripts", "10mhc", [328, 303]],
            ["mobile.special.mobilediff.styles", "15z4m"],
            ["skins.minerva.base.styles", "r41t1"],
            ["skins.minerva.content.styles", "6f199"],
            ["skins.minerva.content.styles.images", "177yq"],
            ["skins.minerva.icons.loggedin", "sda8k"],
            ["skins.minerva.amc.styles", "iknlq"],
            ["wikimedia.ui", "15ygx"],
            ["skins.minerva.icons.wikimedia", "14gf3"],
            ["skins.minerva.icons.images", "1at3z"],
            ["skins.minerva.icons.images.scripts", "3m146", [340, 342, 343, 341]],
            [
                "skins.minerva.icons.images.scripts.misc", "17ecc"
            ],
            ["skins.minerva.icons.page.issues.uncolored", "mh324"],
            ["skins.minerva.icons.page.issues.default.color", "1b22b"],
            ["skins.minerva.icons.page.issues.medium.color", "y20cr"],
            ["skins.minerva.mainPage.styles", "1ph8l"],
            ["skins.minerva.userpage.icons", "14758"],
            ["skins.minerva.userpage.styles", "cuopd"],
            ["skins.minerva.personalMenu.icons", "19du9"],
            ["skins.minerva.mainMenu.advanced.icons", "cu4rg"],
            ["skins.minerva.mainMenu.icons", "17yah"],
            ["skins.minerva.mainMenu.styles", "1bzp8"],
            ["skins.minerva.loggedin.styles", "hv0k3"],
            ["skins.minerva.scripts", "gec0r", [13, 63, 70, 114, 303, 339, 337, 349, 350, 336]],
            ["skins.minerva.options.share.icon", "133yc"],
            ["skins.minerva.options", "1b4nx", [353, 352]],
            ["skins.minerva.talk", "1gxv2", [352]],
            ["skins.minerva.toggling", "3m146"],
            ["skins.minerva.watchstar", "10u0z", [352]],
            ["ext.math.styles", "p6yk4"],
            ["ext.math.visualEditor", "8v20n", [358, 267]],
            ["ext.math.visualEditor.mathSymbolsData", "ck829", [359]],
            [
                "ext.math.visualEditor.chemSymbolsData", "ar9ku", [359]
            ],
            ["ext.babel", "1ya3u"],
            ["ext.echo.logger", "5idr1", [64, 142]],
            ["ext.echo.ui", "7dmv6", [365, 363, 492, 52, 149, 158, 159, 165, 169, 170, 171]],
            ["ext.echo.dm", "28iq7", [367, 28]],
            ["ext.echo.api", "1h9wi", [38]],
            ["ext.echo.init", "yjudo", [366, 63, 83]],
            ["ext.echo.styles.badge", "1f5qd"],
            ["ext.echo.styles.notifications", "1birh"],
            ["ext.echo.styles.alert", "291lw"],
            ["ext.echo.special", "b6sa0", [372, 364]],
            ["ext.echo.styles.special", "y1gjk"],
            ["ext.thanks.images", "h9mfj"],
            ["ext.thanks.mobilediff", "11v78", [373, 33, 83, 52]],
            ["ext.disambiguator.visualEditor", "86u4q", [273]],
            ["ext.codeEditor.icons", "cj4r1"],
            ["ext.relatedArticles.cards", "1vafj", [378, 65, 142]],
            ["ext.relatedArticles.lib", "1lq2u"],
            ["ext.relatedArticles.readMore.gateway", "vbs1t", [142]],
            ["ext.relatedArticles.readMore.bootstrap", "ychxq", [379, 25, 63, 70, 64, 66]],
            ["ext.relatedArticles.readMore", "t5g92", [65]],
            ["ext.RevisionSlider.dialogImages", "6rr3r"],
            ["ext.TwoColConflict.Split.TourImages", "4q8it"],
            [
                "ext.eventLogging", "1g5do", [64]
            ],
            ["ext.eventLogging.debug", "32tft"],
            ["ext.wikimediaEvents", "90539", [384, 63, 70]],
            ["ext.wikimediaEvents.loggedin", "9yjdr", [63, 64]],
            ["ext.wikimediaEvents.wikibase", "m1obg"],
            ["ext.navigationTiming", "1s7ja", [384, 13]],
            ["ext.navigationTiming.rumSpeedIndex", "18q6u"],
            ["ext.uls.common", "xfad9", [399, 69, 64]],
            ["ext.uls.i18n", "ryuue", [16, 65]],
            ["ext.uls.languagenames", "10lnk"],
            ["ext.uls.mediawiki", "dafyk", [391, 393, 395, 398]],
            ["ext.uls.messages", "p09o3", [392]],
            ["ext.uls.webfonts.mobile", "1i4t8", [397, 401]],
            ["ext.uls.webfonts.repository", "rs3wl"],
            ["jquery.uls", "1x6f0", [16, 399, 400]],
            ["jquery.uls.data", "1fh1c"],
            ["jquery.uls.grid", "14gmv"],
            ["jquery.webfonts", "9oya9"],
            ["ext.cx.model", "4mmy0"],
            ["ext.cx.feedback", "17klr", [402]],
            ["ext.cx.dashboard", "6qkfc", [403, 419, 408, 412, 421, 424, 168]],
            ["ext.cx.util", "s2wxm", [402]],
            ["mw.cx.util", "1ewhp", [402, 64]],
            ["ext.cx.sitemapper", "8yyhm", [402, 38, 63, 69, 64]],
            ["mw.cx.SourcePageSelector", "1emu9", [409, 429]],
            ["mw.cx.SelectedSourcePage", "1oxvu", [
                415, 21, 410, 160
            ]],
            ["mw.cx.ui.LanguageFilter", "13ml7", [394, 83, 115, 420, 406, 165]],
            ["ext.cx.progressbar", "8e8s0", [83]],
            ["mw.cx.dashboard.lists", "cql3l", [411, 405, 417, 119, 28, 410, 162, 169]],
            ["ext.cx.stats", "1sgs0", [414, 407, 405, 418, 417, 399, 83, 28, 421]],
            ["chart.js", "1mzyb"],
            ["ext.cx.tools.validator", "xwydv", [407]],
            ["ext.cx.widgets.overlay", "k84vy", [402]],
            ["ext.cx.widgets.spinner", "1evoy", [402]],
            ["ext.cx.widgets.callout", "190bu"],
            ["ext.cx.widgets.translator", "grcx9", [402, 33, 80]],
            ["mw.cx.ui", "lnc6e", [402, 145]],
            ["mw.cx.ui.Header", "1hor4", [430, 171, 172]],
            ["mw.cx.ui.Header.legacy", "xx4m8", [424, 430, 171, 172]],
            ["mw.cx.ui.Header.skin", "gyyr9"],
            ["mw.cx.ui.Infobar", "18fqi", [428, 406]],
            ["mw.cx.ui.CaptchaDialog", "qhonp", [494, 420]],
            ["mw.cx.ui.LoginDialog", "178m7", [65, 420]],
            ["mw.cx.ui.PublishSettingsWidget", "1n9lt", [420, 165]],
            ["mw.cx.ui.MessageWidget", "130xv", [420, 158, 165]],
            ["mw.cx.ui.PageSelectorWidget", "ub2k5", [407, 399, 431, 165]],
            ["mw.cx.ui.PersonalMenuWidget", "1txre", [64, 119, 420]],
            ["mw.cx.ui.TitleOptionWidget",
                "17r3o", [119, 420]
            ],
            ["mw.cx.ui.FeatureDiscoveryWidget", "13jcb", [57, 420]],
            ["mw.externalguidance.init", "1fgk8", [63]],
            ["mw.externalguidance", "13ah9", [38, 303, 435, 162]],
            ["mw.externalguidance.icons", "1xfid"],
            ["mw.externalguidance.special", "55570", [399, 38, 113, 303, 435]],
            ["ext.graph.styles", "1lq2v"],
            ["ext.graph.data", "lnpu6"],
            ["ext.graph.loader", "8172k", [33]],
            ["ext.graph.vega1", "1m2sq", [438, 63]],
            ["ext.graph.vega2", "1qjrz", [438, 63]],
            ["ext.graph.visualEditor", "v8ryi", [438, 270]],
            ["ext.ores.highlighter", "1sjet"],
            ["ext.ores.styles", "1hlik"],
            ["ext.ores.specialoresmodels.styles", "hw0rh"],
            ["ext.quicksurveys.views", "1bpzr", [447, 63, 149]],
            ["ext.quicksurveys.lib", "lq9sb", [69, 70, 64, 66]],
            ["ext.quicksurveys.init", "whcbm", [447]],
            ["ext.kartographer", "1dc46"],
            ["ext.kartographer.extlinks", "4pzke"],
            ["ext.kartographer.style", "1vr45"],
            ["ext.kartographer.site", "1jxyp"],
            ["mapbox", "5srhh"],
            ["leaflet.draw", "u1yue", [453]],
            ["ext.kartographer.link", "17n50", [457, 143]],
            ["ext.kartographer.box", "vf06k", [458, 469, 452, 451, 461, 25,
                63, 33, 168
            ]],
            ["ext.kartographer.linkbox", "dcx08", [461]],
            ["ext.kartographer.data", "1j9o2"],
            ["ext.kartographer.dialog", "1r6da", [143, 154, 159]],
            ["ext.kartographer.dialog.sidebar", "ap5hk", [450, 165, 170]],
            ["ext.kartographer.util", "l19ye", [449]],
            ["ext.kartographer.frame", "bgmn5", [456, 143]],
            ["ext.kartographer.staticframe", "16nwv", [457, 143, 168]],
            ["ext.kartographer.preview", "1yz42"],
            ["ext.kartographer.editing", "a5a6e", [33]],
            ["ext.kartographer.editor", "3m146", [456, 454]],
            ["ext.kartographer.visualEditor", "1qn3g", [461, 267, 25, 167]],
            ["ext.kartographer.lib.prunecluster", "f3p92", [453]],
            ["ext.kartographer.lib.topojson", "1b1b9", [453]],
            ["ext.kartographer.wv", "17qgu", [468, 162]],
            ["ext.kartographer.specialMap", "5cvhg"],
            ["mw.config.values.wbRepo", "1vusr"],
            ["wikibase", "vbcn0"],
            ["wikibase.api.RepoApi", "ro5g9"],
            ["wikibase.api.RepoApiError", "1vilh", [479]],
            ["wikibase.api.getLocationAgnosticMwApi", "16854", [38]],
            ["vue2", "1t4qs"],
            ["util.ContentLanguages", "179ss", [479]],
            ["util.inherit", "1px7t"],
            [
                "skins.monobook.mobile.echohack", "1fm8o", [65, 158]
            ],
            ["ext.cite.visualEditor.core", "drpil", [267]],
            ["ext.cite.visualEditor.data", "1w4rw", [257]],
            ["ext.cite.visualEditor", "1uye5", [182, 181, 481, 482, 274, 158, 161, 165]],
            ["ext.geshi.visualEditor", "rtoah", [267]],
            ["ext.gadget.switcher", "g3anh", [], 4],
            ["ext.gadget.MobileCategories", "1e5kt", [33], 4],
            ["ext.gadget.MobileMaps", "9tp59", [], 4],
            ["ext.visualEditor.mwextensionmessages", "1kc8h"],
            ["mobile.notifications.overlay", "18w99", [364, 303, 145]],
            ["mobile.editor.ve", "139gu", [249, 305]],
            ["ext.echo.emailicons", "1u410"],
            ["ext.echo.secondaryicons", "lj2th"],
            ["ext.wikimediaEvents.visualEditor", "b57n6", [248]],
            ["mw.cx.externalmessages", "38r8y"],
            ["ext.quicksurveys.survey.perceived-performance-survey", "8wwz6"]
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
            "wgVersion": "1.34.0-wmf.22",
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
            "wgWikiID": "enwiki",
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
                    "15": !0,
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
            "wgWMEStatsdBaseUri": "/beacon/statsv",
            "wgWMEReadingDepthSamplingRate": 0.005,
            "wgWMEReadingDepthEnabled": !1,
            "wgWMEPrintSamplingRate": 0,
            "wgWMEPrintEnabled": !0,
            "wgWMECitationUsagePopulationSize": 0,
            "wgWMECitationUsagePageLoadPopulationSize": 0,
            "wgWMESchemaEditAttemptStepSamplingRate": "0.0625",
            "wgWMEWikidataCompletionSearchClicks": [],
            "wgWMEPhp7SamplingRate": 1,
            "wgWMEMobileWebUIActionsTracking": 0.1,
            "wgULSIMEEnabled": !1,
            "wgULSWebfontsEnabled": !1,
            "wgULSPosition": "interlanguage",
            "wgULSAnonCanChangeLanguage": !1,
            "wgULSEventLogging": !0,
            "wgULSImeSelectors": ["input:not([type])", "input[type=text]", "input[type=search]", "textarea", "[contenteditable]"],
            "wgULSNoImeSelectors": ["#wpCaptchaWord", ".ve-ce-surface-paste", ".ve-ce-surface-readOnly [contenteditable]", ".ace_editor textarea"],
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
            "wgNoticeHideUrls": ["//en.wikipedia.org/w/index.php?title=Special:HideBanners", "//meta.wikimedia.org/w/index.php?title=Special:HideBanners", "//commons.wikimedia.org/w/index.php?title=Special:HideBanners", "//species.wikimedia.org/w/index.php?title=Special:HideBanners", "//en.wikibooks.org/w/index.php?title=Special:HideBanners", "//en.wikiquote.org/w/index.php?title=Special:HideBanners", "//en.wikisource.org/w/index.php?title=Special:HideBanners", "//en.wikinews.org/w/index.php?title=Special:HideBanners", "//en.wikiversity.org/w/index.php?title=Special:HideBanners", "//www.mediawiki.org/w/index.php?title=Special:HideBanners"],
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
