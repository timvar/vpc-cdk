import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as logs from '@aws-cdk/aws-logs'
import * as s3 from '@aws-cdk/aws-s3'

export class VpcCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCs

    const vpc1 = new ec2.Vpc(this, 'pepeVPC1', {
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'pepePublic1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'pepePrivate1',
          subnetType: ec2.SubnetType.ISOLATED,
          cidrMask: 20,
        },
      ],
    });

    const vpc2 = new ec2.Vpc(this, 'pepeVPC2', {
      cidr: '10.1.0.0/16',
      subnetConfiguration: [
        {
          name: 'pepePublic2',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'pepePrivate2',
          subnetType: ec2.SubnetType.ISOLATED,
          cidrMask: 20,
        },
      ],
    });

    // Peering connections

    const peering = new ec2.CfnVPCPeeringConnection(this, 'pepePeering', {
      peerVpcId: vpc2.vpcId,
      vpcId: vpc1.vpcId,
    });

    // Routes for peering

    new ec2.CfnRoute(this, 'pepeRoutePeering', {
      routeTableId: vpc1.publicSubnets[0].routeTable.routeTableId,
      vpcPeeringConnectionId: peering.ref,
      destinationCidrBlock: '10.1.0.0/16',
    });

    new ec2.CfnRoute(this, 'pepeRoute2to1', {
      routeTableId: vpc2.publicSubnets[0].routeTable.routeTableId,
      vpcPeeringConnectionId: peering.ref,
      destinationCidrBlock: '10.0.0.0/16',
    });

    new ec2.GatewayVpcEndpoint(this, 'pepeS3', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      vpc: vpc1,
      subnets: [
        {
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    });

    // const pepeFlowLogResource = ec2.FlowLogResourceType.fromVpc(vpc1);
    const pepeLogGroup = new logs.LogGroup(this, 'pepeLogGroup1', {
      retention: logs.RetentionDays.INFINITE
    })

    const pepeBucket = new s3.Bucket(this, 'pepeBucket1', {
      bucketName: 'pepe-flow-log'
    })

    vpc1.addFlowLog('pepeFlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(pepeLogGroup)
    })

    vpc2.addFlowLog('pepeFlowLogS3', {
      destination: ec2.FlowLogDestination.toS3(pepeBucket)
    })

    /*
    new ec2.FlowLog(this, 'pepeFlowLog', {
      resourceType: {
        resourceType: pepeFlowLogResource.resourceType,
        resourceId: pepeFlowLogResource.resourceId
      },
      destination: ec2.FlowLogDestination.toCloudWatchLogs({env: {account: "090199979012", region: "eu-west-1"}, logGroupArn: pepeLogGroup.logGroupArn, logGroupName: pepeLogGroup.logGroupName, node: , stack: this}

      }
      )
    });
*/
    /*

  // NACL

  const pepeNacl = new ec2.NetworkAcl(this, 'pepeNACL', {
    vpc: vpc1,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const allIPv4 = ec2.AclCidr;
    const tcpRule = ec2.AclTraffic;

    pepeNacl.addEntry('allowHTTPOut', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 50,
      traffic: tcpRule.tcpPort(80),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowSSHOut', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 60,
      traffic: tcpRule.tcpPort(22),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowHTTPIn', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 50,
      traffic: tcpRule.tcpPort(80),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    pepeNacl.addEntry('allowSSHIn', {
      cidr: allIPv4.anyIpv4(),
      ruleNumber: 60,
      traffic: tcpRule.tcpPort(22),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // User data

    const pepeUserData = ec2.UserData.forLinux()
    pepeUserData.addCommands(
      'sudo yum update',
      '',
      '',
    );

    */

    const pepeSecurityGroup1 = new ec2.SecurityGroup(this, 'PepeSG1', {
      vpc: vpc1,
      allowAllOutbound: true,
    });

    pepeSecurityGroup1.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    pepeSecurityGroup1.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    pepeSecurityGroup1.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing());

    const pepeLinuxImage = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    new ec2.Instance(this, 'pepeInstancePublic1', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: pepeLinuxImage,
      vpc: vpc1,
      securityGroup: pepeSecurityGroup1,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const pepeSecurityGroup2 = new ec2.SecurityGroup(this, 'PepeSG2', {
      vpc: vpc2,
      allowAllOutbound: true,
    });

    pepeSecurityGroup2.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    pepeSecurityGroup2.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    pepeSecurityGroup2.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing());

    new ec2.Instance(this, 'pepeInstancePublic2', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: pepeLinuxImage,
      vpc: vpc2,
      securityGroup: pepeSecurityGroup2,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
  }
}
