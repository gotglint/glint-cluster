// gulp
const gulp = require('gulp');

// plugins
const eslint = require('gulp-eslint');

// testing
const istanbul = require('gulp-istanbul');
const mocha = require('gulp-mocha');

// utilities
const del = require('del');
const exec = require('child_process').exec;
const runSequence = require('run-sequence');

// package info
const pkginfo = require('./package.json');

gulp.task('clean', () => {
  return del(['dist/**', 'coverage/**']);
});

gulp.task('docs', function(done) {
  exec(`mr-doc -n "${pkginfo.description} ${pkginfo.version} API Reference" -s src --theme glint`, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    done(err);
  });
});

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', 'test/**/*.js', 'gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('coverage', ['lint'], () => {
  return gulp.src(['src/**/*.js'])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire());
});

gulp.task('test:coverage', ['lint', 'coverage'], () => {
  return gulp.src('./test/unit/**/*.js')
    .pipe(mocha({
      reporter: 'spec',
      quiet:    false,
      colors:   true,
      timeout:  10000
    }))
    .pipe(istanbul.writeReports({
      reporters: ['lcov']
    }));
});

gulp.task('test:no-coverage', ['lint'], () => {
  return gulp.src('./test/unit/**/*.js')
    .pipe(mocha({
      reporter: 'spec',
      quiet:    false,
      colors:   true,
      timeout:  10000
    }));
});

gulp.task('test', ['lint', 'coverage'], () => {
  return gulp.src('./test/unit/**/*.js')
    .pipe(mocha({
      reporter: 'spec',
      quiet:    false,
      colors:   true,
      timeout:  10000
    }))
    .pipe(istanbul.writeReports({
      reporters: ['text-summary']
    }));
});

gulp.task('build', ['test'], () => {
  // commented out, since we don't do any transpilation or concatenation or minification or whatever (yet)
  // return gulp.src('src/**/*.js')
  //  .pipe(gulp.dest('dist'));
});

gulp.task('watch', () => {
  gulp.watch('src/**/*.js', ['build']);
});

gulp.task('default', (callback) => {
  runSequence('clean', 'test', callback);
});

gulp.task('ci', (callback) => {
  runSequence('clean', 'build', 'test:coverage', callback);
});

gulp.task('dist', ['lint']);
