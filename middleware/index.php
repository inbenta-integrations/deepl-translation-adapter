<?php

require __DIR__ . '/vendor/autoload.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: X-Requested-With,content-type,X-Inbenta-Token');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == "OPTIONS") {
    die;
}

use App\DeeplTranslator;
use Dotenv\Dotenv;


$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$app = new DeeplTranslator($_ENV);
$response = $app->translate();

echo json_encode($response);
