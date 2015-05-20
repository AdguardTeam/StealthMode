module.exports = function (grunt) {

    require('time-grunt')(grunt);

    // Load NPM Tasks
    require('load-grunt-tasks')(grunt, ['grunt-*']);


    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: ["skin/css", "skin/i"],

        less: {
            files: [
                "style.less"
            ],
            dev: {
                options: {
                    sourceMap: true,
                    sourceMapRootpath: "/"
                },
                files: [
                    {
                        expand: true,
                        cwd: 'less',
                        src: "<%= less.files %>",
                        dest: "skin/css",
                        ext: '.css'
                    }
                ]
            },
            prod: {
                options: {
                    yuicompress: false
                },
                files: [
                    {
                        expand: true,
                        cwd: 'less',
                        src: "<%= less.files %>",
                        dest: "skin/css",
                        ext: '.css'
                    }
                ]
            }
        },

        autoprefixer: {
            dev: {
                browsers: ['last 3 version', 'ie 9'],
                options: {
                    map: true
                },
                expand: true,
                flatten: true,
                src: 'skin/css/*.css',
                dest: 'skin/css'
            },
            prod: {
                browsers: ['last 3 version', 'ie 9'],
                expand: true,
                flatten: true,
                src: 'skin/css/*.css',
                dest: 'skin/css'
            }
        },

        cmq: {
            options: {
                log: false
            },
            media: {
                files: {
                    'skin/css': ['skin/css/*.css']
                }
            }
        },

        csso: {
            compress: {
                options: {
                    report: 'gzip'
                },
                files: [
                    {
                        expand: true,
                        cwd: 'skin/css/',
                        src: ['*.css', '!*.min.css'],
                        dest: 'skin/css/',
                        ext: '.css'
                    }
                ]
            }
        },

        imagemin: {
            dev: {
                files: [
                    {
                        expand: true,
                        src: ['i/**/*.{png,jpg,gif,svg}'],
                        dest: 'skin/'
                    }
                ]
            }
        },

        copy: {
            dev: {
                files: [
                    {
                        expand: true,
                        src: ['fonts/**/*', 'video/**/*'],
                        dest: 'skin/'
                    }
                ]
            }
        },

        watch: {
            css: {
                files: 'less/**/*.less',
                tasks: ['styles:dev']
            },
            images: {
                files: 'i/**/*.{png,jpg,gif,svg}',
                tasks: ['imagemin']
            },
            fonts: {
                files: ['fonts/**', 'video/**'],
                tasks: ['copy']
            }
        }

    });

    grunt.registerTask('styles:dev', ['less:dev', 'autoprefixer:dev']);
    grunt.registerTask('styles:prod', ['less:prod', 'autoprefixer:prod', 'csso']);

    grunt.registerTask('compile', ['clean', 'styles:dev', 'imagemin', 'copy']);

    grunt.registerTask('build', ['clean', 'styles:prod', 'imagemin', 'copy']);

    grunt.registerTask('default', ['compile', 'watch']);

};