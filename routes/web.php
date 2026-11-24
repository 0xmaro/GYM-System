<?php

use Illuminate\Support\Facades\Route;

// أي مسار المستخدم يكتبه، لارافل هيفتحله صفحة welcome والـ React هو اللي هيتصرف
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
Route::get('/.well-known/{any}', fn() => response()->json(['error' => 'Not found'], 404))
    ->where('any', '.*');
