import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { AclCidr } from '@aws-cdk/aws-ec2';

export class VpcCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'pepeVPC', {
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'pepePublic',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'pepePrivate',
          subnetType: ec2.SubnetType.PRIVATE,
          cidrMask: 20,
        },
      ],
      maxAzs: 1,
    });

    const pepeNacl = new ec2.NetworkAcl(this, 'pepeNACL', {
      vpc,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const allIPv4 = ec2.AclCidr;
    const tcpRule = ec2.AclTraffic;

    pepeNacl.addEntry('denyHTTP', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 50,
      traffic: tcpRule.tcpPort(80),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowHTTP', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 50,
      traffic: tcpRule.tcpPort(80),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    const pepeUserData = ec2.UserData.forLinux();
    pepeUserData.addCommands(
      'yum install -y nginx',
      'chkconfig nginx on',
      'service nginx start',
    );

    const pepeSecurityGroup = new ec2.SecurityGroup(this, 'PepeSG', {
      vpc,
      allowAllOutbound: true,
    });

    pepeSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    new ec2.Instance(this, 'pepeInstance', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      vpc,
      userData: pepeUserData,
      securityGroup: pepeSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
  }
}
