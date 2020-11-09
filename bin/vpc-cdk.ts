#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VpcCdkStack } from '../lib/vpc-cdk-stack';

const app = new cdk.App();
new VpcCdkStack(app, 'VpcCdkStack');
