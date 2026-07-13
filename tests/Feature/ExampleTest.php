<?php

test('the site root shows guests the branded welcome page', function () {
    $response = $this->get('/');

    $response->assertOk();
});
