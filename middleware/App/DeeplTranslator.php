<?php

namespace App;

use GuzzleHttp\Client as Guzzle;
use GuzzleHttp\Exception\ClientException;

class DeeplTranslator
{
    protected $request;
    protected $env;
    protected $authKey;
    protected $deeplUrl;

    public function __construct($env)
    {
        $this->request = json_decode(file_get_contents('php://input'));
        $this->env = $env;

        if (!$this->validateRequest()) {
            echo "Error with request";
            die;
        }
        if (!$this->validateToken()) {
            echo "Error with validation";
            die;
        }
        $this->authKey = $this->env["AUTH_KEY"];
        $this->deeplUrl = $this->env["DEEPL_URL"];
    }

    /**
     * 
     */
    public function validateRequest(): bool
    {
        if (is_null($this->request)) return false;
        if (!isset($this->request->text)) return false;
        if (!isset($this->request->target_lang)) return false;
        return true;
    }

    /**
     * Check if the token is the same
     * @return bool
     */
    protected function validateToken(): bool
    {
        if (trim($this->request->token) === "") return false;

        if (isset($this->env["TOKEN"])) {
            if ($this->env["TOKEN"] !== $this->request->token) return false;
        }
        return true;
    }

    /**
     * Create a new ticket
     * @return object
     */
    public function translate(): object
    {
        $url = $this->deeplUrl;
        $url .= "?auth_key=" . $this->authKey;
        $url .= "&text=" . $this->request->text;
        $url .= "&target_lang=" . $this->request->target_lang;

        if (isset($this->request->source_lang) && $this->request->source_lang !== '') {
            $url .= "&source_lang=" . $this->request->source_lang;
        }

        $payload = (object) [];
        $headers = [
            "DeepL-Auth-Key" => $this->authKey,
            "Content-Type" => "application/json"
        ];
        return $this->remoteRequest($url, $payload, $headers);
    }

    /**
     * Execute the remote request
     * @param string $url
     * @param object $params
     * @param array $headers
     * @return object
     */
    private function remoteRequest(string $url, object $params, array $headers): object
    {
        $response = (object) [
            "success" => false
        ];

        try {
            $client = new Guzzle();
            $clientParams = ['headers' => $headers];
            $clientParams['body'] = json_encode($params);
            $serverOutput = $client->post($url, $clientParams);

            if (method_exists($serverOutput, 'getBody')) {
                $responseBody = $serverOutput->getBody();
                if (method_exists($responseBody, 'getContents')) {

                    $response = json_decode($responseBody->getContents());
                    $response->success = true;
                    return $response;
                }
            }
        } catch (ClientException $e) {
            if (method_exists($e, "getResponse")) {
                $response["message"] = $e->getResponse()->getBody()->getContents();
            }
        }
        return $response;
    }
}
