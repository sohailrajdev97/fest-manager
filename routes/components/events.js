var express = require('express');
var router = express.Router();
var fq = require('fuzzquire');
var eventsService = fq("services/events").model;
var config = fq('config-loader');
var sort = fq('sort');

var applyStateChanges = function (req) {
	req.stateparams.title = {
		text: 'Events',
		route: '/events',
	};
	req.stateparams.submenu = [{
			route: "/events#Competition",
			label: "Competitions",
			class: "Competition",
		},
		{
			route: "/events#Workshop",
			label: "Workshops",
			class: "Workshop",
		},
		{
			route: "/events#Talk",
			label: "Talks",
			class: "Talk",
		},
		{
			route: "/events#Proshow",
			label: "Shows",
			class: "Show",
		}
	];
	return req;
};

router.get('/', function (req, res, next) {
	req.stateparams.pagetitle = 'Events';
	req = applyStateChanges(req);
	eventsService.find(function (err, events) {
		console.log(err);
		if (err) return next(err);

		events = events.filter(elem => {
			return !elem.route.endsWith('!');
		});

		events = sort(events, 'name');

		res.renderState('events/home', {
			title: 'Events',
			user: req.user,
			events: events
		});
	});
});

router.get('/schedule', function (req, res, next) {
	req.stateparams.pagetitle = 'Schedule';
	req = applyStateChanges(req);
	req.stateparams.subtitle = "Events Schedule";
	req.stateparams.immersive = false;
	eventsService.find({}).then(events => {
		var days = [
			[],
			[],
			[]
		];
		events.forEach(elem => {
			if (elem.startTime && elem.startTime.startsWith('27')) days[0].push(elem);
			if (elem.startTime && elem.startTime.startsWith('28')) days[1].push(elem);
			if (elem.startTime && elem.startTime.startsWith('29')) days[2].push(elem);
		});
		res.renderState('events/schedule', {
			title: 'Schedule',
			user: req.user,
			days: days,
		});
	}).catch(err => {
		console.log(err);
		next(err);
	});
});

router.get('/:eventroute', function (req, res, next) {
	req = applyStateChanges(req);
	eventsService.findOne({
		route: req.params.eventroute
	}, function (err, data) {
		if (err) return next(err);
		if (!data || data.route.endsWith('!')) {
			var err1 = new Error('Not Found');
			err1.status = 404;
			return next(err1);
		}
		if (data.route.startsWith('@')) {
			var myurl = '/components/' + data.route.split('@')[1];
			return res.redirect(myurl);
		}
		if (data.immersive) {
			req.stateparams.immersive = false;
		}
		req.stateparams.pagetitle = data.name;
		var marked = require('marked');
		marked.setOptions({
			renderer: new marked.Renderer(),
			gfm: true,
			tables: true,
			breaks: false,
			pedantic: false,
			sanitize: false,
			smartLists: true,
			smartypants: false
		});
		res.renderState('events/event', {
			title: data.name,
			user: req.user,
			event: data,
			marked: marked,
			config: config,
		});
	});
});

module.exports = router;
