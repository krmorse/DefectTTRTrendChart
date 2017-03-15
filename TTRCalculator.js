Ext.define('TTRCalculator', {

    config: {
        bucketBy: '',
        priorities: []
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    prepareChartData: function(store) {
        var data = this._groupData(store),
        categories = _.keys(data),
        priorities = this.priorities;

        var series = {};
        _.each(categories, function(category) {
            var group = data[category];
            var recordsByPriority = _.groupBy(group, function(record) {
                return record.get('Priority') || 'None';
            }, this);
            _.each(priorities, function(priority) {
                series[priority] = series[priority] || [];
                var records = recordsByPriority[priority] || [];
                var totalTTR = 0;
                _.each(records, function(record) {
                    totalTTR += moment(record.get('ClosedDate')).diff(moment(record.get('OpenedDate')), 'days');
                });
                series[priority].push(totalTTR / Math.max(records.length, 1));
            }, this);
        }, this);

        return {
            categories: categories,
            series: _.map(priorities, function(value) {
                return {
                    name: value,
                    type: 'line',
                    data: series[value]
                };
            }, this)
        };
    },

    _groupData: function(store) {
        return _.groupBy(store.getRange(), function(record) {
            if (this.bucketBy === 'week') {
                return moment(record.get('ClosedDate')).startOf('week').format('MMM D');
            } else if (this.bucketBy === 'month') {
                return moment(record.get('ClosedDate')).startOf('month').format('MMM \'YY');
            }
        }, this);
    }
});
