var gulp =       require('gulp');
var gutil =      require('gulp-util');
var uglify =     require('gulp-uglify');
var jshint =     require('gulp-jshint');
var webpack =    require('gulp-webpack');
var rename =     require('gulp-rename');
var coffee =     require('gulp-coffee');
var concat =     require('gulp-concat');
var header =     require('gulp-header');
var git =        require('gulp-git');
var runSeq =     require('run-sequence');
var fs =         require('fs');
var del =        require('del');
var bower =      require('gulp-bower');
var replace =      require('gulp-replace');
var exec =       require('child_process').exec;
                 require('gulp-grunt')(gulp);

var config = {
  chains: [119, 147, 188, 215, 216, 217, 218, 280, 281, 294, 'roundy', 'common', 'silver', 'bronze'],
  tasks: [ 'clone-ds', 'copy-ds'],
  tasksClone: [],
  tasksCopy: [],
  branch: 'master'
};

// get the current branch name
gulp.task('current-branch', function(cb) {
  return git.exec({ args: 'branch' }, function(err, stdout) {
    if (err) throw err;
    config.branch = stdout.replace('* ', '').replace(/\s*$/gi, '');
    cb();
  });
});

function createCopyTask(chain) {
  var srcFile = 'git_components/ds-' + chain + '/asset/' + chain + '/**';
  var destFile = 'asset/' + chain;
  if (chain == 'common')
  {
    srcFile = 'git_components/ds-' + chain + '/asset/**';
    destFile = 'asset';
  }
  
  // create copy tasks
  gulp.task('copy-ds-' + chain, function() {
    return gulp.src(srcFile,
      { base: srcFile.replace('/**', ''), env: process.env })
      .pipe(gulp.dest(destFile));
  });

  config.tasksCopy.push('copy-ds-' + chain);
}

gulp.task('clean', function(cb) {
  del(['./git_components/**'], cb);
});

function createChainTask(chain) {
  // create clone tasks
  gulp.task('clone-ds-' + chain, function(cb) {
    if (!fs.existsSync('./git_components/ds-' + chain )) {
      var arg = 'clone -b ' + config.branch + ' https://github.com/gsn/ds-' + chain + '.git git_components/ds-' + chain;
      // console.log(arg)
      return git.exec({args:arg }, function (err, stdout) {
        if (err) throw err;
        createCopyTask(chain);
        cb();
      })
    }
    else {
      var arg = 'git fetch && git merge --ff-only origin/' + config.branch;
      exec(arg, { cwd: process.cwd() + '/git_components/ds-' + chain },
          function (error, stdout, stderr) {
            if (stdout.indexOf('up-to-date') < 0 || !fs.existsSync('./asset/' + chain)) {
              if (chain != 'common') {
                createCopyTask(chain);
              }
            }
            cb();
        });
    }
  });
  config.tasksClone.push('clone-ds-' + chain);
}

// build task off current branch name
for(var c in config.chains) {
  var chain = config.chains[c];
  createChainTask(chain);
};

gulp.task('build-copy', function(cb){
  if (config.tasksCopy.length > 0)
    runSeq(config.tasksCopy, cb);
  else cb();
});

// create bower task
gulp.task('bower', function() {
  return bower();
})

// always copy common
createCopyTask('common');

// copy gsndfp
gulp.task('copy-gsndfp', function() {
  return gulp.src(['./bower_components/gsndfp/dist/*.js'])
    .pipe(gulp.dest('./script/gsndfp'));
});

gulp.task('ds-common-config-for-local-cdn', function(){
  return gulp.src(['./git_components/ds-common/asset/config.json'])
    .pipe(replace('http://cdn-staging.gsngrocers.com', ''))
    .pipe(gulp.dest('./asset'));
});

config.tasksCopy.push('copy-gsndfp');
  
// run tasks in sequential order
gulp.task('default', function(cb) {
  runSeq('current-branch', 'bower', config.tasksClone, 'build-copy', 'ds-common-config-for-local-cdn', cb);
});
