Ext.define('DefectTTRTrendChartApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    layout: 'fit',

    requires: [
        'TTRCalculator'
    ],

    config: {
        defaultSettings: {
            bucketBy: 'week',
            query: ''
        }
    },

    launch: function() {
        Rally.data.wsapi.ModelFactory.getModel({
            type: 'defect'
        }).then({
            success: function(model) {
                this.model = model;
                this._loadPriorities();
            },
            scope: this
        });
    },

    getSettingsFields: function() {
        return [
            {
                name: 'bucketBy',
                xtype: 'rallycombobox',
                plugins: ['rallyfieldvalidationui'],
                fieldLabel: 'Bucket By',
                displayField: 'name',
                valueField: 'value',
                editable: false,
                allowBlank: false,
                store: {
                    fields: ['name', 'value'],
                    data: [
                        { name: 'Week', value: 'week' },
                        { name: 'Month', value: 'month' },
                        //{ name: 'Quarter', value: 'quarter' },
                        //{ name: 'Iteration', value: 'iteration' }
                    ]
                },
                lastQuery: ''
            },
            {
                type: 'query'
            }
        ];
    },

    _loadPriorities: function() {
        this.model.getField('Priority').getAllowedValueStore().load().then({
            success: function(records) {
                this.priorities = _.map(records, function(record) {
                    return record.get('StringValue') || 'None';
                });
                this._addChart();
            },
            scope: this
        });
    },

    _addChart: function() {
        var context = this.getContext(),
            whiteListFields = ['Milestones', 'Tags'],
            modelNames = [this.model.typePath],
            gridBoardConfig = {
                xtype: 'rallygridboard',
                toggleState: 'chart',
                chartConfig: this._getChartConfig(),
                plugins: [{
                    ptype:'rallygridboardinlinefiltercontrol',
                    showInChartMode: true,
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: context.getScopedStateId('filters'),
                        filterChildren: false,
                        modelNames: modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                defaultFields: ['Owner', 'PlanEstimate', 'Severity'],
                                addQuickFilterConfig: {
                                   whiteListFields: whiteListFields
                                }
                            },
                            advancedFilterPanelConfig: {
                               advancedFilterRowsConfig: {
                                   propertyFieldConfig: {
                                       whiteListFields: whiteListFields
                                   }
                               }
                           }
                        }
                    }
                }],
                context: context,
                modelNames: modelNames,
                storeConfig: {
                    filters: this._getFilters()
                }
            };

        this.add(gridBoardConfig);
    },

    _getChartConfig: function() {
        return {
            xtype: 'rallychart',
            storeType: 'Rally.data.wsapi.Store',
            storeConfig: {
                context: this.getContext().getDataContext(),
                limit: Infinity,
                fetch: this._getChartFetch(),
                sorters: this._getChartSort(),
                pageSize: 2000,
                model: this.model
            },
            calculatorType: 'TTRCalculator',
            calculatorConfig: {
                bucketBy: this.getSetting('bucketBy'),
                priorities: this.priorities
            },
            chartColors: [
                "#FF8200", // $orange
                "#1E7C00", // $green_dk
                "#005EB8", // $blue
                "#7832A5", // $purple
                "#B81B10" // $red
            ],
            chartConfig: {
                chart: { type: 'line' },
                title: {
                    text: ''
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Time to Resolution (Days)'
                    }
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'middle'
                },
                plotOptions: {
                    line: {
                        dataLabels: {
                            enabled: false
                        }
                    }
                }
            }
        };
    },

    onTimeboxScopeChange: function() {
        this.callParent(arguments);

        var gridBoard = this.down('rallygridboard');
        if (gridBoard) {
            gridBoard.destroy();
        }
        this._addChart();
    },

    _getChartFetch: function() {
        return ['Priority', 'Iteration', 'StartDate', 'Name', 'ClosedDate', 'OpenedDate'];
    },

    _getChartSort: function() {
        return [{ property: 'ClosedDate', direction: 'ASC' }];
    },

    _getFilters: function() {
        var queries = [
            { property: 'State', operator: '=', value: 'Closed' },
            { property: 'OpenedDate', operator: '!=', value: null }
            ],
            timeboxScope = this.getContext().getTimeboxScope();
        if (timeboxScope) {
            queries.push(timeboxScope.getQueryFilter());
        }
        if (this.getSetting('query')) {
            queries.push(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
        }
        return queries;
    }
});
