// gulp
const gulp = require('gulp');

// plugins
const eslint = require('gulp-eslint');

// testing
const mocha = require('gulp-mocha');

// utilities
const del = require('del');
const runSequence = require('run-sequence');

gulp.task('clean', () => {
  return del(['dist/**']);
});

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', 'test/**/*.js', 'gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('test', ['lint'], () => {
  return gulp.src('./test/**/*.js')
    .pipe(mocha({
      reporter: 'spec',
      quiet: false,
      colors: true,
      timeout: 10000
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
  runSequence('clean', 'build', callback);
});

gulp.task('dist', ['test']);
